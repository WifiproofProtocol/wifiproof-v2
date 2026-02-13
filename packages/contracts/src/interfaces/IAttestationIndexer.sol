// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAttestationIndexer
/// @notice Interface for the Coinbase Attestation Indexer on Base
/// @dev Deployed at 0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C on Base
interface IAttestationIndexer {
    /// @notice Returns the attestation UID for a given recipient and schema
    /// @param recipient The address to check
    /// @param schema The schema UID to check against
    /// @return The attestation UID, or bytes32(0) if none exists
    function getAttestationUid(address recipient, bytes32 schema) external view returns (bytes32);
}
