// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, AttestationRequest, AttestationRequestData} from
    "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IHonkVerifier} from "./interfaces/IHonkVerifier.sol";
import {IAttestationIndexer} from "./interfaces/IAttestationIndexer.sol";
import {NUMBER_OF_PUBLIC_INPUTS, PAIRING_POINTS_SIZE} from "./Verifier.sol";

/// @title WiFiProof V2
/// @notice Mints soulbound attendance attestations with three-layer verification:
///         1. Coinbase KYC — proves unique human via on-chain indexer
///         2. ZK Geolocation — proves physical presence via Noir circuit
///         3. IP Signature — proves WiFi connectivity via EIP-712 server signature
/// @author WiFiProof Protocol
contract WiFiProof is Ownable2Step, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    // ═══════════════════════════════════════════════════════════════════
    //                          IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════

    /// @notice EAS contract on Base (predeploy)
    IEAS public immutable eas;

    /// @notice Noir UltraHonk ZK verifier
    IHonkVerifier public immutable verifier;

    /// @notice Coinbase on-chain attestation indexer
    IAttestationIndexer public immutable cbIndexer;

    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice EIP-712 typehash for IP verification signatures
    bytes32 public constant IP_VERIFICATION_TYPEHASH = keccak256(
        "IPVerification(address wallet,bytes32 eventId,bytes32 venueHash,uint64 deadline)"
    );

    /// @notice Number of public inputs expected from the Noir circuit
    /// @dev Derived from the generated verifier (excludes pairing points)
    uint256 public constant EXPECTED_PUBLIC_INPUTS = NUMBER_OF_PUBLIC_INPUTS - PAIRING_POINTS_SIZE;

    /// @notice BN254 scalar field modulus used by Noir/UltraHonk
    uint256 public constant FIELD_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /// @notice Index of event_id in the public inputs array
    /// @dev Public inputs layout: [venue_lat, venue_lon, threshold_sq, event_id]
    uint256 public constant EVENT_ID_PUBLIC_INPUT_INDEX = 3;

    /// @notice Coinbase Verified Account schema UID (network-specific)
    bytes32 public immutable cbVerifiedAccountSchema;

    /// @notice Coinbase official attester address (network-specific)
    address public immutable cbAttester;

    // ═══════════════════════════════════════════════════════════════════
    //                            STATE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Server signer address for IP verification signatures
    address public ipSigner;

    /// @notice WiFiProof EAS schema UID (set post-deployment after schema registration)
    bytes32 public wifiproofSchema;

    /// @notice Prevents double-claiming: eventId => wallet => claimed
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    /// @notice On-chain event registry: eventId => EventData
    mapping(bytes32 => EventData) public events;

    /// @notice Registered event metadata
    struct EventData {
        bytes32 venueHash; // keccak256(abi.encode(venue_lat_field, venue_lon_field, threshold_sq_field, event_id_field))
        uint64 startTime;
        uint64 endTime;
        string venueName;
        bool exists;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event EventCreated(
        bytes32 indexed eventId,
        bytes32 venueHash,
        uint64 startTime,
        uint64 endTime,
        string venueName
    );

    event AttendanceClaimed(
        address indexed attendee,
        bytes32 indexed eventId,
        bytes32 attestationUid,
        uint256 timestamp
    );

    event IpSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event SchemaUpdated(bytes32 indexed oldSchema, bytes32 indexed newSchema);

    // ═══════════════════════════════════════════════════════════════════
    //                           ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error AlreadyClaimed(bytes32 eventId, address wallet);
    error InvalidZKProof();
    error InvalidIPSignature();
    error SignatureExpired();
    error NoKYCAttestation();
    error EventNotActive();
    error EventNotFound();
    error EventAlreadyExists();
    error SchemaNotSet();
    error ZeroAddress();
    error InvalidEventTimes();
    error InvalidPublicInputs();
    error InvalidVenueHash();
    error VenueHashMismatch();
    error InvalidSchema();

    // ═══════════════════════════════════════════════════════════════════
    //                         CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /// @param _eas EAS contract address (0x4200000000000000000000000000000000000021 on Base)
    /// @param _verifier Deployed HonkVerifier contract address
    /// @param _cbIndexer Coinbase Attestation Indexer (0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C on Base)
    /// @param _cbAttester Coinbase official attester address (network-specific)
    /// @param _cbVerifiedAccountSchema Coinbase Verified Account schema UID (network-specific)
    /// @param _ipSigner Server signer address for IP verification
    /// @param _owner Contract owner (can create events, update ipSigner and schema)
    constructor(
        address _eas,
        address _verifier,
        address _cbIndexer,
        address _cbAttester,
        bytes32 _cbVerifiedAccountSchema,
        address _ipSigner,
        address _owner
    ) Ownable(_owner) EIP712("WiFiProof", "2") {
        if (
            _eas == address(0)
            || _verifier == address(0)
            || _cbIndexer == address(0)
            || _cbAttester == address(0)
            || _ipSigner == address(0)
        ) {
            revert ZeroAddress();
        }
        if (_cbVerifiedAccountSchema == bytes32(0)) revert InvalidSchema();

        eas = IEAS(_eas);
        verifier = IHonkVerifier(_verifier);
        cbIndexer = IAttestationIndexer(_cbIndexer);
        ipSigner = _ipSigner;
        cbAttester = _cbAttester;
        cbVerifiedAccountSchema = _cbVerifiedAccountSchema;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      EVENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Register a new event with trusted venue data
    /// @param eventId Unique event identifier
    /// @param venueHash keccak256(abi.encode(venue_lat, venue_lon, threshold_sq, event_id_field)) using BN254 field values
    /// @param startTime Event start timestamp (unix)
    /// @param endTime Event end timestamp (unix)
    /// @param venueName Human-readable venue name
    function createEvent(
        bytes32 eventId,
        bytes32 venueHash,
        uint64 startTime,
        uint64 endTime,
        string calldata venueName
    ) external onlyOwner {
        if (events[eventId].exists) revert EventAlreadyExists();
        if (venueHash == bytes32(0)) revert InvalidVenueHash();
        if (startTime >= endTime) revert InvalidEventTimes();

        events[eventId] = EventData({
            venueHash: venueHash,
            startTime: startTime,
            endTime: endTime,
            venueName: venueName,
            exists: true
        });

        emit EventCreated(eventId, venueHash, startTime, endTime, venueName);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       CORE FUNCTION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mint a soulbound attendance attestation with full verification
    /// @param proof ZK proof bytes generated by the Noir circuit
    /// @param publicInputs Public inputs from the circuit [venue_lat, venue_lon, threshold_sq, event_id]
    /// @param ipSignature EIP-712 server signature proving WiFi connectivity
    /// @param sigDeadline Expiry timestamp of the IP signature
    /// @param eventId Unique event identifier (must be registered via createEvent)
    /// @return attestationUid The UID of the minted EAS attestation
    function claimAttendance(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        bytes calldata ipSignature,
        uint64 sigDeadline,
        bytes32 eventId
    ) external payable nonReentrant returns (bytes32 attestationUid) {
        // --- Pre-checks ---
        if (wifiproofSchema == bytes32(0)) revert SchemaNotSet();

        EventData storage evt = events[eventId];
        if (!evt.exists) revert EventNotFound();
        if (block.timestamp < evt.startTime || block.timestamp > evt.endTime) revert EventNotActive();
        if (block.timestamp > sigDeadline) revert SignatureExpired();
        if (hasClaimed[eventId][msg.sender]) revert AlreadyClaimed(eventId, msg.sender);
        if (publicInputs.length != EXPECTED_PUBLIC_INPUTS) revert InvalidPublicInputs();

        // Ensure event_id public input matches the provided eventId
        bytes32 eventIdField = _eventIdToField(eventId);
        if (publicInputs[EVENT_ID_PUBLIC_INPUT_INDEX] != eventIdField) revert InvalidPublicInputs();

        // --- Bind public inputs to trusted event data ---
        // Hash the venue coordinates from public inputs and compare to registered venueHash
        bytes32 computedVenueHash = _hashPublicInputs(publicInputs);
        if (computedVenueHash != evt.venueHash) revert VenueHashMismatch();

        // --- Layer 1: Coinbase KYC (unique human) ---
        if (!_hasValidKYC(msg.sender)) revert NoKYCAttestation();

        // --- Layer 2: ZK Geolocation (physical presence) ---
        if (!verifier.verify(proof, publicInputs)) revert InvalidZKProof();

        // --- Layer 3: IP Signature (WiFi connectivity, EIP-712) ---
        if (!_verifyIPSignature(ipSignature, msg.sender, eventId, evt.venueHash, sigDeadline)) {
            revert InvalidIPSignature();
        }

        // --- Effects ---
        hasClaimed[eventId][msg.sender] = true;

        // --- Interaction: Mint EAS attestation ---
        attestationUid = eas.attest(
            AttestationRequest({
                schema: wifiproofSchema,
                data: AttestationRequestData({
                    recipient: msg.sender,
                    expirationTime: 0, // Never expires
                    revocable: true, // Can revoke if fraud detected
                    refUID: bytes32(0),
                    data: abi.encode(eventId, evt.venueName, block.timestamp, true, true),
                    value: msg.value
                })
            })
        );

        emit AttendanceClaimed(msg.sender, eventId, attestationUid, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Hash the venue-related public inputs for comparison against the registered venueHash
    /// @param publicInputs The full array of public inputs from the circuit
    /// @return The keccak256 hash of the venue coordinate public inputs
    function _hashPublicInputs(bytes32[] calldata publicInputs) internal pure returns (bytes32) {
        // Public inputs layout: [venue_lat, venue_lon, threshold_sq, event_id]
        return keccak256(abi.encode(
            publicInputs[0],
            publicInputs[1],
            publicInputs[2],
            publicInputs[EVENT_ID_PUBLIC_INPUT_INDEX]
        ));
    }

    /// @notice Helper to compute a venue hash from BN254 field values
    /// @param venueLatField Field-encoded latitude (scaled)
    /// @param venueLonField Field-encoded longitude (scaled)
    /// @param thresholdSqField Field-encoded distance threshold squared
    /// @param eventId Unique event identifier
    function computeVenueHash(
        uint256 venueLatField,
        uint256 venueLonField,
        uint256 thresholdSqField,
        bytes32 eventId
    ) public pure returns (bytes32) {
        bytes32 eventIdField = _eventIdToField(eventId);
        return keccak256(
            abi.encode(bytes32(venueLatField), bytes32(venueLonField), bytes32(thresholdSqField), eventIdField)
        );
    }

    /// @notice Helper to convert scaled coordinates into field values and compute venue hash
    /// @param venueLatScaled Scaled latitude (can be negative)
    /// @param venueLonScaled Scaled longitude (can be negative)
    /// @param thresholdSqScaled Scaled distance threshold squared
    /// @param eventId Unique event identifier
    function computeVenueHashFromScaled(
        int256 venueLatScaled,
        int256 venueLonScaled,
        uint256 thresholdSqScaled,
        bytes32 eventId
    ) public pure returns (bytes32) {
        uint256 latField = _toField(venueLatScaled);
        uint256 lonField = _toField(venueLonScaled);
        uint256 thresholdField = thresholdSqScaled % FIELD_MODULUS;
        return computeVenueHash(latField, lonField, thresholdField, eventId);
    }

    /// @dev Converts a signed int into BN254 field representation
    function _toField(int256 value) internal pure returns (uint256) {
        if (value >= 0) {
            return uint256(value);
        }

        uint256 absValue = uint256(-value);
        return FIELD_MODULUS - (absValue % FIELD_MODULUS);
    }

    /// @dev Converts bytes32 eventId into BN254 field representation
    function _eventIdToField(bytes32 eventId) internal pure returns (bytes32) {
        uint256 value = uint256(eventId) % FIELD_MODULUS;
        return bytes32(value);
    }

    /// @dev Checks if the wallet has a valid Coinbase KYC attestation via the on-chain indexer
    /// @param wallet The wallet address to verify
    /// @return True if the wallet has a non-revoked Coinbase Verified Account attestation
    function _hasValidKYC(address wallet) internal view returns (bool) {
        bytes32 uid = cbIndexer.getAttestationUid(wallet, cbVerifiedAccountSchema);
        if (uid == bytes32(0)) return false;

        Attestation memory attestation = eas.getAttestation(uid);
        return attestation.recipient == wallet
            && attestation.attester == cbAttester
            && attestation.revocationTime == 0
            && (attestation.expirationTime == 0 || attestation.expirationTime > block.timestamp);
    }

    /// @dev Verifies the server's EIP-712 signature proving WiFi connectivity
    /// @param signature The ECDSA signature from the server
    /// @param wallet The claiming wallet address
    /// @param eventId The event identifier
    /// @param venueHash The venue hash (binds signature to venue)
    /// @param deadline Signature expiry timestamp
    /// @return True if the signature is valid and from the ipSigner
    function _verifyIPSignature(
        bytes calldata signature,
        address wallet,
        bytes32 eventId,
        bytes32 venueHash,
        uint64 deadline
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(abi.encode(
            IP_VERIFICATION_TYPEHASH,
            wallet,
            eventId,
            venueHash,
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        return recovered == ipSigner;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Update the IP verification signer address
    /// @param _newSigner New server signer address
    function setIpSigner(address _newSigner) external onlyOwner {
        if (_newSigner == address(0)) revert ZeroAddress();
        emit IpSignerUpdated(ipSigner, _newSigner);
        ipSigner = _newSigner;
    }

    /// @notice Set the WiFiProof EAS schema UID (called after schema registration)
    /// @param _schema The registered schema UID
    function setSchema(bytes32 _schema) external onlyOwner {
        emit SchemaUpdated(wifiproofSchema, _schema);
        wifiproofSchema = _schema;
    }
}
