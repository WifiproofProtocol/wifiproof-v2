// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, AttestationRequest, AttestationRequestData} from
    "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IHonkVerifier} from "./interfaces/IHonkVerifier.sol";
import {IAttestationIndexer} from "./interfaces/IAttestationIndexer.sol";

/// @title WiFiProof V2
/// @notice Mints soulbound attendance attestations with three-layer verification:
///         1. Coinbase KYC — proves unique human via on-chain indexer
///         2. ZK Geolocation — proves physical presence via Noir circuit
///         3. IP Signature — proves WiFi connectivity via server signature
/// @author WiFiProof Protocol
contract WiFiProof is Ownable2Step, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

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

    /// @notice Coinbase Verified Account schema UID
    bytes32 public constant CB_VERIFIED_ACCOUNT_SCHEMA =
        0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9;

    /// @notice Coinbase official attester address
    address public constant CB_ATTESTER = 0x357458739F90461b99789350868CD7CF330Dd7EE;

    // ═══════════════════════════════════════════════════════════════════
    //                            STATE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Server signer address for IP verification signatures
    address public ipSigner;

    /// @notice WiFiProof EAS schema UID (set post-deployment after schema registration)
    bytes32 public wifiproofSchema;

    /// @notice Prevents double-claiming: eventId => wallet => claimed
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════════

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
    error NoKYCAttestation();
    error EventNotActive();
    error SchemaNotSet();
    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════
    //                         CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /// @param _eas EAS contract address (0x4200000000000000000000000000000000000021 on Base)
    /// @param _verifier Deployed HonkVerifier contract address
    /// @param _cbIndexer Coinbase Attestation Indexer (0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C on Base)
    /// @param _ipSigner Server signer address for IP verification
    /// @param _owner Contract owner (can update ipSigner and schema)
    constructor(
        address _eas,
        address _verifier,
        address _cbIndexer,
        address _ipSigner,
        address _owner
    ) Ownable(_owner) {
        if (_eas == address(0) || _verifier == address(0) || _cbIndexer == address(0) || _ipSigner == address(0)) {
            revert ZeroAddress();
        }

        eas = IEAS(_eas);
        verifier = IHonkVerifier(_verifier);
        cbIndexer = IAttestationIndexer(_cbIndexer);
        ipSigner = _ipSigner;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       CORE FUNCTION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mint a soulbound attendance attestation with full verification
    /// @param proof ZK proof bytes generated by the Noir circuit
    /// @param publicInputs Public inputs: [venue_lat, venue_lon, threshold_sq, ...]
    /// @param ipSignature Server-signed proof of WiFi connectivity
    /// @param eventId Unique event identifier
    /// @param eventStartTime Event start timestamp (unix)
    /// @param eventEndTime Event end timestamp (unix)
    /// @param venueName Human-readable venue name (stored in attestation)
    /// @return attestationUid The UID of the minted EAS attestation
    function claimAttendance(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        bytes calldata ipSignature,
        bytes32 eventId,
        uint64 eventStartTime,
        uint64 eventEndTime,
        string calldata venueName
    ) external nonReentrant returns (bytes32 attestationUid) {
        // --- Pre-checks ---
        if (wifiproofSchema == bytes32(0)) revert SchemaNotSet();
        if (block.timestamp < eventStartTime || block.timestamp > eventEndTime) revert EventNotActive();
        if (hasClaimed[eventId][msg.sender]) revert AlreadyClaimed(eventId, msg.sender);

        // --- Layer 1: Coinbase KYC (unique human) ---
        if (!_hasValidKYC(msg.sender)) revert NoKYCAttestation();

        // --- Layer 2: ZK Geolocation (physical presence) ---
        if (!verifier.verify(proof, publicInputs)) revert InvalidZKProof();

        // --- Layer 3: IP Signature (WiFi connectivity) ---
        if (!_verifyIPSignature(ipSignature, msg.sender, eventId)) revert InvalidIPSignature();

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
                    data: abi.encode(eventId, venueName, block.timestamp, true, true),
                    value: 0
                })
            })
        );

        emit AttendanceClaimed(msg.sender, eventId, attestationUid, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Checks if the wallet has a valid Coinbase KYC attestation via the on-chain indexer
    /// @param wallet The wallet address to verify
    /// @return True if the wallet has a non-revoked Coinbase Verified Account attestation
    function _hasValidKYC(address wallet) internal view returns (bool) {
        // Query the Coinbase Attestation Indexer for the attestation UID
        bytes32 uid = cbIndexer.getAttestationUid(wallet, CB_VERIFIED_ACCOUNT_SCHEMA);
        if (uid == bytes32(0)) return false;

        // Verify the attestation exists, is from Coinbase, and is not revoked
        Attestation memory attestation = eas.getAttestation(uid);
        return attestation.attester == CB_ATTESTER
            && attestation.revocationTime == 0
            && (attestation.expirationTime == 0 || attestation.expirationTime > block.timestamp);
    }

    /// @dev Verifies the server's IP signature proving WiFi connectivity
    /// @param signature The ECDSA signature from the server
    /// @param wallet The claiming wallet address
    /// @param eventId The event identifier
    /// @return True if the signature is valid and from the ipSigner
    function _verifyIPSignature(
        bytes calldata signature,
        address wallet,
        bytes32 eventId
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(wallet, eventId));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
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
