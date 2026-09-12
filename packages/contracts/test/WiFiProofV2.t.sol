// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {AttestationRequest} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

import {WiFiProofV2} from "../src/WiFiProofV2.sol";
import {IHonkVerifier} from "../src/interfaces/IHonkVerifier.sol";

contract MockHonkVerifier is IHonkVerifier {
    bool public valid = true;

    function setValid(bool valid_) external {
        valid = valid_;
    }

    function verify(bytes calldata, bytes32[] calldata) external view returns (bool) {
        return valid;
    }
}

contract MockEAS {
    bytes32 public constant UID = keccak256("wifiproof-test-attestation");
    bytes32 public lastSchema;
    address public lastRecipient;
    bool public lastRevocable;
    bytes public lastData;

    function attest(AttestationRequest calldata request) external payable returns (bytes32) {
        lastSchema = request.schema;
        lastRecipient = request.data.recipient;
        lastRevocable = request.data.revocable;
        lastData = request.data.data;
        return UID;
    }
}

contract WiFiProofV2Test is Test {
    uint256 internal constant AUTHOR_PRIVATE_KEY = 0xA11CE;
    uint256 internal constant NEW_AUTHOR_PRIVATE_KEY = 0xB0B;
    uint256 internal constant EVENT_FEE = 5e6;
    uint32 internal constant WORLD_FACTOR = 1;
    bytes32 internal constant SCHEMA =
        keccak256("eventId,attendanceNullifier,policyHash,evidenceCommitment,factorBitmap,verifiedAt");
    bytes32 internal constant EVENT_ID = keccak256("event-1");
    bytes32 internal constant NULLIFIER = keccak256("event-1:world-nullifier");
    bytes32 internal constant EVIDENCE = keccak256("evidence-bundle");

    ERC20Mock internal usdc;
    MockHonkVerifier internal verifier;
    MockEAS internal eas;
    WiFiProofV2 internal protocol;

    address internal organizer = makeAddr("organizer");
    address internal treasury = makeAddr("treasury");
    address internal relayer = makeAddr("relayer");
    address internal owner = makeAddr("safe");
    address internal authorizer;

    bytes32[] internal publicInputs;
    bytes32 internal venueCommitment;
    bytes32 internal policyHash;
    uint32 internal standardFactors;

    function setUp() public {
        vm.warp(1_800_000_000);
        authorizer = vm.addr(AUTHOR_PRIVATE_KEY);
        usdc = new ERC20Mock();
        verifier = new MockHonkVerifier();
        eas = new MockEAS();
        protocol = new WiFiProofV2(
            address(eas), address(verifier), address(usdc), treasury, authorizer, relayer, owner, SCHEMA, EVENT_FEE
        );
        // Exercise protocol entry points only. Arbitrary callers can always force-send
        // an ERC-20 to any address, which is outside the fee-flow invariant.
        targetContract(address(protocol));
        standardFactors = protocol.STANDARD_FACTORS();

        publicInputs.push(bytes32(uint256(37_774_900)));
        publicInputs.push(bytes32(uint256(122_419_400)));
        publicInputs.push(bytes32(uint256(807_000_000)));
        publicInputs.push(bytes32(uint256(EVENT_ID) % protocol.FIELD_MODULUS()));
        venueCommitment = keccak256(abi.encode(publicInputs));

        usdc.mint(organizer, 100e6);
        vm.startPrank(organizer);
        usdc.approve(address(protocol), type(uint256).max);
        policyHash = protocol.createEvent(
            EVENT_ID,
            keccak256("ipfs://event-metadata"),
            venueCommitment,
            uint64(block.timestamp - 1),
            uint64(block.timestamp + 1 days),
            standardFactors
        );
        vm.stopPrank();
    }

    function _authorization() internal view returns (WiFiProofV2.AttendanceAuthorization memory) {
        return WiFiProofV2.AttendanceAuthorization({
            eventId: EVENT_ID,
            attendanceNullifier: NULLIFIER,
            factorBitmap: standardFactors,
            evidenceCommitment: EVIDENCE,
            publicInputsHash: venueCommitment,
            policyHash: policyHash,
            deadline: uint64(block.timestamp + 5 minutes)
        });
    }

    function _sign(WiFiProofV2.AttendanceAuthorization memory authorization, uint256 privateKey)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = protocol.hashAttendanceAuthorization(authorization);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _claim() internal returns (bytes32) {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.prank(relayer);
        return protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_CreateEventTransfersFeeDirectlyToTreasury() public view {
        assertEq(usdc.balanceOf(treasury), EVENT_FEE);
        assertEq(usdc.balanceOf(address(protocol)), 0);
    }

    function test_CreateEventRequiresStandardFactors() public {
        bytes32 otherEvent = keccak256("event-2");
        vm.expectRevert(WiFiProofV2.MissingStandardFactors.selector);
        vm.prank(organizer);
        protocol.createEvent(
            otherEvent,
            keccak256("metadata-2"),
            keccak256("venue-2"),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            WORLD_FACTOR
        );
    }

    function test_CreateEventRevertsWhenUsdcTransferFails() public {
        bytes32 otherEvent = keccak256("event-3");
        vm.expectRevert();
        vm.prank(makeAddr("unfunded-organizer"));
        protocol.createEvent(
            otherEvent,
            keccak256("metadata-3"),
            keccak256("venue-3"),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            standardFactors
        );
    }

    function test_ClaimCreatesAnonymousEasReceipt() public {
        bytes32 uid = _claim();
        assertEq(uid, eas.UID());
        assertTrue(protocol.usedNullifiers(EVENT_ID, NULLIFIER));
        assertEq(eas.lastSchema(), SCHEMA);
        assertEq(eas.lastRecipient(), address(protocol));
        assertFalse(eas.lastRevocable());

        (
            bytes32 eventId,
            bytes32 attendanceNullifier,
            bytes32 receiptPolicyHash,
            bytes32 evidenceCommitment,
            uint32 factorBitmap,
            uint64 verifiedAt
        ) = abi.decode(eas.lastData(), (bytes32, bytes32, bytes32, bytes32, uint32, uint64));
        assertEq(eventId, EVENT_ID);
        assertEq(attendanceNullifier, NULLIFIER);
        assertEq(receiptPolicyHash, policyHash);
        assertEq(evidenceCommitment, EVIDENCE);
        assertEq(factorBitmap, standardFactors);
        assertEq(verifiedAt, block.timestamp);
    }

    function test_DuplicateNullifierReverts() public {
        _claim();
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(WiFiProofV2.NullifierAlreadyUsed.selector, EVENT_ID, NULLIFIER));
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_ExpiredAuthorizationReverts() public {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        authorization.deadline = uint64(block.timestamp - 1);
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(WiFiProofV2.AuthorizationExpired.selector);
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_PolicyMismatchReverts() public {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        authorization.policyHash = keccak256("wrong-policy");
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(WiFiProofV2.PolicyMismatch.selector);
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_MissingFactorsReverts() public {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        authorization.factorBitmap = WORLD_FACTOR;
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(
            abi.encodeWithSelector(WiFiProofV2.MissingRequiredFactors.selector, standardFactors, WORLD_FACTOR)
        );
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_InvalidProofRevertsAndDoesNotConsumeNullifier() public {
        verifier.setValid(false);
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(WiFiProofV2.InvalidZKProof.selector);
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
        assertFalse(protocol.usedNullifiers(EVENT_ID, NULLIFIER));
    }

    function test_PublicInputMutationReverts() public {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        publicInputs[3] = bytes32(uint256(publicInputs[3]) + 1);
        vm.expectRevert(WiFiProofV2.PublicInputsMismatch.selector);
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function test_AuthorizerRotationRejectsOldSignerAndAcceptsNewSigner() public {
        address newAuthorizer = vm.addr(NEW_AUTHOR_PRIVATE_KEY);
        vm.prank(owner);
        protocol.setAuthorizer(newAuthorizer);

        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory oldSignature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        bytes memory newSignature = _sign(authorization, NEW_AUTHOR_PRIVATE_KEY);
        vm.expectRevert(WiFiProofV2.InvalidAuthorization.selector);
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, oldSignature, hex"1234", publicInputs);

        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, newSignature, hex"1234", publicInputs);
    }

    function test_PauseBlocksClaimsAndEventCreation() public {
        vm.prank(owner);
        protocol.pause();

        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert();
        vm.prank(relayer);
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);

        vm.expectRevert();
        vm.prank(organizer);
        protocol.createEvent(
            keccak256("paused-event"),
            keccak256("paused-metadata"),
            keccak256("paused-venue"),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            standardFactors
        );
    }

    function test_OnlyRelayerCanSubmit() public {
        WiFiProofV2.AttendanceAuthorization memory authorization = _authorization();
        bytes memory signature = _sign(authorization, AUTHOR_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(WiFiProofV2.NotRelayer.selector, address(this)));
        protocol.claimAttendanceFor(authorization, signature, hex"1234", publicInputs);
    }

    function testFuzz_EventFeeIsForwarded(uint96 fee) public {
        vm.prank(owner);
        protocol.setEventCreationFee(fee);
        usdc.mint(organizer, fee);

        bytes32 otherEvent = keccak256(abi.encode("fuzz-event", fee));
        uint256 beforeBalance = usdc.balanceOf(treasury);
        vm.prank(organizer);
        protocol.createEvent(
            otherEvent,
            keccak256(abi.encode("fuzz-metadata", fee)),
            keccak256(abi.encode("fuzz-venue", fee)),
            uint64(block.timestamp),
            uint64(block.timestamp + 1 days),
            standardFactors
        );
        assertEq(usdc.balanceOf(treasury), beforeBalance + fee);
        assertEq(usdc.balanceOf(address(protocol)), 0);
    }

    function invariant_ProtocolNeverCustodiesUsdcFees() public view {
        assertEq(usdc.balanceOf(address(protocol)), 0);
    }
}
