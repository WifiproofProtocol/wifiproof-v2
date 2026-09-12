// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";

import {HonkVerifier} from "../src/Verifier.sol";
import {WiFiProofV2} from "../src/WiFiProofV2.sol";

/// @notice Deploys the immutable V2 verifier and protocol. OWNER_ADDRESS should be a 2-of-3 Safe.
contract DeployV2 is Script {
    function run() external {
        address eas = vm.envAddress("EAS_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address authorizer = vm.envAddress("ATTENDANCE_AUTHORIZER_ADDRESS");
        address relayer = vm.envAddress("CDP_RELAY_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        bytes32 schema = vm.envBytes32("WIFIPROOF_V2_SCHEMA");
        uint256 eventFee = vm.envOr("EVENT_CREATION_FEE", uint256(5_000_000));
        vm.startBroadcast();
        HonkVerifier verifier = new HonkVerifier();
        WiFiProofV2 protocol =
            new WiFiProofV2(eas, address(verifier), usdc, treasury, authorizer, relayer, owner, schema, eventFee);
        vm.stopBroadcast();

        console2.log("HonkVerifier:", address(verifier));
        console2.log("WiFiProofV2:", address(protocol));
        console2.log("Safe owner:", owner);
        console2.log("Event fee (USDC units):", eventFee);
    }
}
