// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    IEAS,
    AttestationRequest,
    AttestationRequestData
} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {IHonkVerifier} from "./interfaces/IHonkVerifier.sol";
import {NUMBER_OF_PUBLIC_INPUTS, PAIRING_POINTS_SIZE} from "./Verifier.sol";

/// @title WiFiProof V2
/// @notice Immutable, privacy-preserving attendance claims on Base.
/// @dev The owner is intended to be a 2-of-3 Safe. Verification logic is not upgradeable.
contract WiFiProofV2 is Ownable2Step, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint32 public constant FACTOR_WORLD_ID = 1 << 0;
    uint32 public constant FACTOR_VENUE_NETWORK = 1 << 1;
    uint32 public constant FACTOR_ROTATING_QR = 1 << 2;
    uint32 public constant FACTOR_NOIR_PROXIMITY = 1 << 3;
    uint32 public constant FACTOR_SELF = 1 << 4;
    uint32 public constant FACTOR_COINBASE = 1 << 5;
    uint32 public constant STANDARD_FACTORS =
        FACTOR_WORLD_ID | FACTOR_VENUE_NETWORK | FACTOR_ROTATING_QR | FACTOR_NOIR_PROXIMITY;

    uint256 public constant EXPECTED_PUBLIC_INPUTS = NUMBER_OF_PUBLIC_INPUTS - PAIRING_POINTS_SIZE;
    uint256 public constant EVENT_ID_PUBLIC_INPUT_INDEX = 3;
    uint256 public constant FIELD_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    bytes32 public constant ATTENDANCE_AUTHORIZATION_TYPEHASH = keccak256(
        "AttendanceAuthorization(bytes32 eventId,bytes32 attendanceNullifier,uint32 factorBitmap,bytes32 evidenceCommitment,bytes32 publicInputsHash,bytes32 policyHash,uint64 deadline)"
    );

    IEAS public immutable eas;
    IHonkVerifier public immutable verifier;
    IERC20 public immutable usdc;

    address public treasury;
    address public authorizer;
    address public relayer;
    bytes32 public schema;
    uint256 public eventCreationFee;

    struct EventPolicy {
        bytes32 eventId;
        address organizer;
        bytes32 metadataHash;
        bytes32 venueCommitment;
        uint64 startTime;
        uint64 endTime;
        uint32 requiredFactorBitmap;
        bytes32 policyHash;
    }

    struct AttendanceAuthorization {
        bytes32 eventId;
        bytes32 attendanceNullifier;
        uint32 factorBitmap;
        bytes32 evidenceCommitment;
        bytes32 publicInputsHash;
        bytes32 policyHash;
        uint64 deadline;
    }

    mapping(bytes32 eventId => EventPolicy policy) public events;
    mapping(bytes32 eventId => mapping(bytes32 attendanceNullifier => bool used)) public usedNullifiers;

    event EventCreated(
        bytes32 indexed eventId,
        address indexed organizer,
        bytes32 indexed policyHash,
        bytes32 metadataHash,
        bytes32 venueCommitment,
        uint64 startTime,
        uint64 endTime,
        uint32 requiredFactorBitmap,
        uint256 feePaid
    );
    event AttendanceClaimed(
        bytes32 indexed eventId,
        bytes32 indexed attendanceNullifier,
        bytes32 indexed attestationUid,
        bytes32 evidenceCommitment,
        uint32 factorBitmap,
        uint64 verifiedAt
    );
    event EventCreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AuthorizerUpdated(address indexed oldAuthorizer, address indexed newAuthorizer);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event SchemaUpdated(bytes32 indexed oldSchema, bytes32 indexed newSchema);
    event EmergencyPauseUpdated(bool paused);

    error ZeroAddress();
    error InvalidSchema();
    error InvalidEvent();
    error EventAlreadyExists();
    error EventNotFound();
    error EventNotActive();
    error MissingStandardFactors();
    error MissingRequiredFactors(uint32 required, uint32 supplied);
    error NotRelayer(address caller);
    error AuthorizationExpired();
    error InvalidAuthorization();
    error PolicyMismatch();
    error PublicInputsMismatch();
    error VenueCommitmentMismatch();
    error InvalidZKProof();
    error NullifierAlreadyUsed(bytes32 eventId, bytes32 attendanceNullifier);

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer(msg.sender);
        _;
    }

    constructor(
        address eas_,
        address verifier_,
        address usdc_,
        address treasury_,
        address authorizer_,
        address relayer_,
        address owner_,
        bytes32 schema_,
        uint256 eventCreationFee_
    ) Ownable(owner_) EIP712("WiFiProof", "2") {
        if (
            eas_ == address(0) || verifier_ == address(0) || usdc_ == address(0) || treasury_ == address(0)
                || authorizer_ == address(0) || relayer_ == address(0) || owner_ == address(0)
        ) revert ZeroAddress();

        eas = IEAS(eas_);
        verifier = IHonkVerifier(verifier_);
        usdc = IERC20(usdc_);
        treasury = treasury_;
        authorizer = authorizer_;
        relayer = relayer_;
        schema = schema_;
        eventCreationFee = eventCreationFee_;
    }

    /// @notice Creates an event and transfers the configured USDC fee directly to treasury.
    function createEvent(
        bytes32 eventId,
        bytes32 metadataHash,
        bytes32 venueCommitment,
        uint64 startTime,
        uint64 endTime,
        uint32 requiredFactorBitmap
    ) external nonReentrant whenNotPaused returns (bytes32 policyHash) {
        if (eventId == bytes32(0) || metadataHash == bytes32(0) || venueCommitment == bytes32(0)) {
            revert InvalidEvent();
        }
        if (events[eventId].organizer != address(0)) revert EventAlreadyExists();
        if (startTime >= endTime) revert InvalidEvent();
        if ((requiredFactorBitmap & STANDARD_FACTORS) != STANDARD_FACTORS) {
            revert MissingStandardFactors();
        }

        policyHash = keccak256(
            abi.encode(eventId, msg.sender, metadataHash, venueCommitment, startTime, endTime, requiredFactorBitmap)
        );

        events[eventId] = EventPolicy({
            eventId: eventId,
            organizer: msg.sender,
            metadataHash: metadataHash,
            venueCommitment: venueCommitment,
            startTime: startTime,
            endTime: endTime,
            requiredFactorBitmap: requiredFactorBitmap,
            policyHash: policyHash
        });

        uint256 fee = eventCreationFee;
        if (fee != 0) usdc.safeTransferFrom(msg.sender, treasury, fee);

        emit EventCreated(
            eventId,
            msg.sender,
            policyHash,
            metadataHash,
            venueCommitment,
            startTime,
            endTime,
            requiredFactorBitmap,
            fee
        );
    }

    /// @notice Claims attendance without exposing an attendee wallet.
    /// @dev The sponsored relayer submits an authorization signed by the separate evidence authorizer.
    function claimAttendanceFor(
        AttendanceAuthorization calldata authorization,
        bytes calldata signature,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external onlyRelayer nonReentrant whenNotPaused returns (bytes32 attestationUid) {
        EventPolicy storage policy = events[authorization.eventId];
        if (policy.organizer == address(0)) revert EventNotFound();
        if (block.timestamp < policy.startTime || block.timestamp > policy.endTime) revert EventNotActive();
        if (block.timestamp > authorization.deadline) revert AuthorizationExpired();
        if (authorization.policyHash != policy.policyHash) revert PolicyMismatch();
        if ((authorization.factorBitmap & policy.requiredFactorBitmap) != policy.requiredFactorBitmap) {
            revert MissingRequiredFactors(policy.requiredFactorBitmap, authorization.factorBitmap);
        }
        if (authorization.attendanceNullifier == bytes32(0)) revert InvalidAuthorization();
        if (usedNullifiers[authorization.eventId][authorization.attendanceNullifier]) {
            revert NullifierAlreadyUsed(authorization.eventId, authorization.attendanceNullifier);
        }

        bytes32 publicInputsHash = keccak256(abi.encode(publicInputs));
        if (publicInputs.length != EXPECTED_PUBLIC_INPUTS || publicInputsHash != authorization.publicInputsHash) {
            revert PublicInputsMismatch();
        }
        if (uint256(publicInputs[EVENT_ID_PUBLIC_INPUT_INDEX]) != uint256(authorization.eventId) % FIELD_MODULUS) {
            revert PublicInputsMismatch();
        }
        if (publicInputsHash != policy.venueCommitment) revert VenueCommitmentMismatch();

        bytes32 digest = hashAttendanceAuthorization(authorization);
        if (ECDSA.recover(digest, signature) != authorizer) revert InvalidAuthorization();

        usedNullifiers[authorization.eventId][authorization.attendanceNullifier] = true;
        if (!verifier.verify(proof, publicInputs)) revert InvalidZKProof();
        if (schema == bytes32(0)) revert InvalidSchema();

        uint64 verifiedAt;
        (attestationUid, verifiedAt) = _attest(authorization);

        _emitAttendanceClaimed(authorization, attestationUid, verifiedAt);
    }

    function _attest(AttendanceAuthorization calldata authorization)
        internal
        returns (bytes32 attestationUid, uint64 verifiedAt)
    {
        verifiedAt = uint64(block.timestamp);
        attestationUid = eas.attest(
            AttestationRequest({
                schema: schema,
                data: AttestationRequestData({
                    recipient: address(this),
                    expirationTime: 0,
                    revocable: false,
                    refUID: bytes32(0),
                    data: abi.encode(
                        authorization.eventId,
                        authorization.attendanceNullifier,
                        authorization.policyHash,
                        authorization.evidenceCommitment,
                        authorization.factorBitmap,
                        verifiedAt
                    ),
                    value: 0
                })
            })
        );
    }

    function _emitAttendanceClaimed(
        AttendanceAuthorization calldata authorization,
        bytes32 attestationUid,
        uint64 verifiedAt
    ) internal {
        emit AttendanceClaimed(
            authorization.eventId,
            authorization.attendanceNullifier,
            attestationUid,
            authorization.evidenceCommitment,
            authorization.factorBitmap,
            verifiedAt
        );
    }

    function hashAttendanceAuthorization(AttendanceAuthorization calldata authorization)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTENDANCE_AUTHORIZATION_TYPEHASH,
                    authorization.eventId,
                    authorization.attendanceNullifier,
                    authorization.factorBitmap,
                    authorization.evidenceCommitment,
                    authorization.publicInputsHash,
                    authorization.policyHash,
                    authorization.deadline
                )
            )
        );
    }

    function setEventCreationFee(uint256 newFee) external onlyOwner {
        emit EventCreationFeeUpdated(eventCreationFee, newFee);
        eventCreationFee = newFee;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setAuthorizer(address newAuthorizer) external onlyOwner {
        if (newAuthorizer == address(0)) revert ZeroAddress();
        emit AuthorizerUpdated(authorizer, newAuthorizer);
        authorizer = newAuthorizer;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert ZeroAddress();
        emit RelayerUpdated(relayer, newRelayer);
        relayer = newRelayer;
    }

    function setSchema(bytes32 newSchema) external onlyOwner {
        if (newSchema == bytes32(0)) revert InvalidSchema();
        emit SchemaUpdated(schema, newSchema);
        schema = newSchema;
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPauseUpdated(true);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyPauseUpdated(false);
    }
}
