// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {WiFiProof} from "../src/WiFiProof.sol";

/// @title ClaimAttendance
/// @notice Claims attendance using proof + public inputs + IP signature from JSON
contract ClaimAttendance is Script {
    using stdJson for string;

    function run() external {
        string memory claimPath = vm.envOr("CLAIM_JSON", string("./claim.json"));
        string memory json = vm.readFile(claimPath);

        address wifiproofAddress = json.readAddress(".wifiproof");
        bytes32 eventId = json.readBytes32(".eventId");
        uint64 sigDeadline = uint64(json.readUint(".sigDeadline"));
        bytes memory proof = json.readBytes(".proof");
        bytes32[] memory publicInputs = json.readBytes32Array(".publicInputs");
        bytes memory ipSignature = json.readBytes(".ipSignature");
        uint256 value = vm.envOr("CLAIM_VALUE", uint256(0));

        if (wifiproofAddress == address(0)) {
            console2.log("Missing wifiproof address in claim JSON");
            return;
        }
        if (proof.length == 0 || publicInputs.length == 0) {
            console2.log("Missing proof or public inputs in claim JSON");
            return;
        }
        if (ipSignature.length == 0) {
            console2.log("Missing ipSignature in claim JSON");
            return;
        }

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        WiFiProof wifiproof = WiFiProof(wifiproofAddress);
        bytes32 attestationUid = wifiproof.claimAttendance{value: value}(
            proof,
            publicInputs,
            ipSignature,
            sigDeadline,
            eventId
        );

        vm.stopBroadcast();

        console2.log("Attendance claimed, attestation UID:");
        console2.logBytes32(attestationUid);
    }
}
