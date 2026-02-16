// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";

/// @title RegisterSchema
/// @notice Registers the WiFiProof EAS schema on-chain
contract RegisterSchema is Script {
    function run() external {
        address registryAddress = vm.envAddress("SCHEMA_REGISTRY_ADDRESS");
        string memory schema = vm.envString("WIFIPROOF_SCHEMA_STRING");
        bool revocable = vm.envOr("SCHEMA_REVOCABLE", true);
        address resolver = vm.envOr("SCHEMA_RESOLVER", address(0));

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        bytes32 schemaUid = ISchemaRegistry(registryAddress).register(
            schema,
            ISchemaResolver(resolver),
            revocable
        );

        vm.stopBroadcast();

        console2.log("Schema UID:", schemaUid);
    }
}
