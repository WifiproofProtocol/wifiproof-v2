// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {WiFiProof} from "../src/WiFiProof.sol";

/// @title CreateEvent
/// @notice Computes venueHash and creates an event on-chain
contract CreateEvent is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address wifiproofAddress = vm.envAddress("WIFIPROOF_ADDRESS");
        bytes32 eventId = vm.envBytes32("EVENT_ID");

        int256 venueLatScaled = vm.envInt("VENUE_LAT_SCALED");
        int256 venueLonScaled = vm.envInt("VENUE_LON_SCALED");
        uint256 radiusMeters = vm.envUint("RADIUS_METERS");

        uint64 startTime = uint64(vm.envUint("EVENT_START_TIME"));
        uint64 endTime = uint64(vm.envUint("EVENT_END_TIME"));
        string memory venueName = vm.envString("VENUE_NAME");

        WiFiProof wifiproof = WiFiProof(wifiproofAddress);
        address owner = wifiproof.owner();
        if (owner != vm.addr(deployerKey)) {
            console2.log("Skipping createEvent: caller is not owner.");
            console2.log("Owner:", owner);
            return;
        }

        bytes32 venueHash = wifiproof.computeVenueHashFromScaled(
            venueLatScaled,
            venueLonScaled,
            _thresholdSqScaled(radiusMeters),
            eventId
        );

        vm.startBroadcast(deployerKey);
        wifiproof.createEvent(eventId, venueHash, startTime, endTime, venueName);
        vm.stopBroadcast();

        console2.log("Event created:", eventId);
        console2.log("Venue hash:", venueHash);
    }

    function _thresholdSqScaled(uint256 radiusMeters) internal pure returns (uint256) {
        // Mirror proof-app calculation: threshold_sq = (radius_m * 1e6 / 111320)^2
        uint256 radiusScaled = (radiusMeters * 1_000_000) / 111_320;
        return radiusScaled * radiusScaled;
    }
}
