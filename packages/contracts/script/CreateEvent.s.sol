// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {WiFiProof} from "../src/WiFiProof.sol";

/// @title CreateEvent
/// @notice Computes venueHash and creates an event on-chain
contract CreateEvent is Script {
    function run() external {
        WiFiProof wifiproof = WiFiProof(vm.envAddress("WIFIPROOF_ADDRESS"));
        bytes32 eventId = vm.envBytes32("EVENT_ID");

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (deployerKey != 0) {
            if (wifiproof.owner() != vm.addr(deployerKey)) {
                console2.log("Skipping createEvent: caller is not owner.");
                return;
            }
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        bytes32 venueHash = wifiproof.computeVenueHashFromScaled(
            vm.envInt("VENUE_LAT_SCALED"),
            vm.envInt("VENUE_LON_SCALED"),
            _thresholdSqScaled(vm.envUint("RADIUS_METERS")),
            eventId
        );

        wifiproof.createEvent(
            eventId,
            venueHash,
            uint64(vm.envUint("EVENT_START_TIME")),
            uint64(vm.envUint("EVENT_END_TIME")),
            vm.envString("VENUE_NAME")
        );
        vm.stopBroadcast();

        console2.log("Event created:");
        console2.logBytes32(eventId);
        console2.log("Venue hash:");
        console2.logBytes32(venueHash);
    }

    function _thresholdSqScaled(uint256 radiusMeters) internal pure returns (uint256) {
        // Mirror proof-app calculation: threshold_sq = (radius_m * 1e6 / 111320)^2
        uint256 radiusScaled = (radiusMeters * 1_000_000) / 111_320;
        return radiusScaled * radiusScaled;
    }
}
