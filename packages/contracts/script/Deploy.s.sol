// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {WiFiProof} from "../src/WiFiProof.sol";
import {HonkVerifier} from "../src/Verifier.sol";

/// @title Deploy WiFiProof V2
/// @notice Deploys the Honk verifier + WiFiProof gatekeeper contract
contract Deploy is Script {
    function run() external {
        address eas = vm.envAddress("EAS_ADDRESS");
        address cbIndexer = vm.envAddress("CB_INDEXER_ADDRESS");
        address cbAttester = vm.envAddress("CB_ATTESTER");
        bytes32 cbVerifiedAccountSchema = vm.envBytes32("CB_VERIFIED_ACCOUNT_SCHEMA");
        address ipSigner = vm.envAddress("IP_SIGNER_ADDRESS");

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        address owner = vm.envOr("OWNER_ADDRESS", address(0));
        bytes32 schema = vm.envOr("WIFIPROOF_SCHEMA", bytes32(0));

        address deployer;
        if (deployerKey != 0) {
            deployer = vm.addr(deployerKey);
            if (owner == address(0)) {
                owner = deployer;
            }
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
            deployer = msg.sender;
            if (owner == address(0)) {
                owner = deployer;
            }
        }

        HonkVerifier verifier = new HonkVerifier();
        WiFiProof wifiproof = new WiFiProof(
            eas,
            address(verifier),
            cbIndexer,
            cbAttester,
            cbVerifiedAccountSchema,
            ipSigner,
            owner
        );

        if (schema != bytes32(0)) {
            if (owner == deployer) {
                wifiproof.setSchema(schema);
            } else {
                console2.log("Skipping setSchema: OWNER_ADDRESS is not deployer.");
                console2.log("Set schema later from owner:", owner);
            }
        }

        vm.stopBroadcast();

        console2.log("HonkVerifier:", address(verifier));
        console2.log("WiFiProof:", address(wifiproof));
    }
}
