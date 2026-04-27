# WiFiProof V2 Implementation Spec

Last updated: March 26, 2026

This document is the implementation spec for the next WiFiProof phase.

It covers:

- contract v2 design
- upgradeability strategy
- live room challenge
- mobile-first attendee UX
- Base Account paymaster path
- Builder Codes
- organizer dashboard
- humanity-provider strategy
- survey questions
- classroom roadmap

This follows the current priority order:

1. contract v2 design
2. live room challenge
3. mobile-first attendee UX
4. Base Account paymaster for smart wallets now
5. Builder Codes
6. organizer dashboard
7. World remains for hackathon
8. BrightID exploration after

## 1. Core Product Direction

WiFiProof should become multi-mode, not one-mode.

There are two distinct product surfaces:

### 1.1 Open/community events

Use:

- wallet
- optional or required World, depending on event policy
- live room challenge
- subnet check
- ZK proximity proof
- on-chain attestation

This is the current web3 event model.

### 1.2 Institutional/classroom events

Use:

- school-issued identity or school SSO
- live room challenge
- subnet check
- ZK proximity proof
- attendance record tied to a student identifier or school credential
- optional embedded wallet behind the scenes

This is the classroom model.

Important product note:

- open/community mode optimizes for permissionless attendance
- institutional mode optimizes for anti-fraud attendance tied to a known student or staff identity

These should not be forced into the exact same UX or identity assumptions.

## 2. Current Contract Reality

The current deployed contract is not upgradeable.

That means:

- it cannot be turned into a proxy after deployment
- it cannot be upgraded in place
- any contract-level redesign requires a new deployment

However, the old contract does not need to be discarded.

Recommended approach:

- keep the current contract as `v1`
- deploy `v2` behind a proxy
- aggregate protocol stats across both versions
- send new events to `v2` once stable

This preserves:

- historical credibility
- historical event and claim counts
- continuity for the hackathon period

## 3. Upgradeability Strategy

For `v2`, use a proxy-based upgradeable contract.

Recommended pattern:

- OpenZeppelin upgradeable contracts
- UUPS proxy

Why UUPS:

- lighter than transparent proxy
- good fit for a single protocol contract
- easier to reason about once the upgrade path is locked down

Operational rules:

- only `owner` or a governance-controlled upgrade role can upgrade
- all upgrades must preserve storage layout
- emit explicit version and upgrade events
- keep a changelog of implementation addresses

Do not migrate `v1` state onchain unless absolutely necessary.
Instead:

- keep `v1` immutable
- start `v2` clean
- show combined analytics in the app

## 4. Contract V2 Goals

Contract v2 should solve two real protocol gaps:

1. sponsored claims for EOAs and smart wallets
2. organizer event fee collection

It should not hardcode a single humanity provider such as World.

Humanity should stay an offchain acceptance layer that results in a backend authorization.

## 5. Contract V2 Claim Model

### 5.1 Direct claim path

Keep a direct claim path for users paying their own gas.

Example:

- `claimAttendance(...)`

This remains useful for:

- EOAs that want to self-claim
- smart wallets without sponsorship
- debugging and low-complexity fallback

### 5.2 Relayed claim path

Add a relayed path so a sponsor or relayer can submit on behalf of the attendee.

Example:

- `claimAttendanceFor(address claimer, ..., AttendanceAuthorization auth, bytes claimerSig)`

The important shift is:

- the attendee becomes `claimer`
- the relayer becomes `msg.sender`

The contract must stop assuming `msg.sender` is the attendee in the relayed path.

### 5.3 Required signature model

The relayed path should use two signatures:

1. backend authorization
2. attendee claim intent

#### Backend authorization

The backend signs a typed payload after all offchain checks pass:

- humanity provider accepted
- live room challenge accepted
- subnet accepted
- event active
- event and venue binding accepted

Suggested typed data:

- `claimer`
- `eventId`
- `venueHash`
- `challengeHash`
- `humanityProvider`
- `humanityNullifier`
- `deadline`

This can be named `AttendanceAuthorization`.

#### Attendee claim intent

The attendee signs the exact claim intent so the relayer cannot mutate the payload.

Suggested typed data:

- `claimer`
- `eventId`
- `proofHash`
- `publicInputsHash`
- `authorizationHash`
- `deadline`

This can be named `ClaimIntent`.

### 5.4 Why two signatures

The backend signature proves:

- "the app authorized this attendance attempt"

The attendee signature proves:

- "the attendee approved this exact claim payload"

Without the attendee signature, a relayer or backend could potentially misuse the authorization.

## 6. Contract V2 State Changes

Add:

- `mapping(bytes32 => bool) usedClaimIntents`
- `uint256 organizerEventFee`
- `address feeCollector`
- upgradeable storage gap if using OZ upgradeable pattern

Preserve existing useful state concepts:

- events
- `hasClaimed[eventId][claimer]`
- signer configuration
- schema configuration

In the relayed path:

- check `hasClaimed[eventId][claimer]`
- mint attestation to `claimer`
- not `msg.sender`

## 7. Contract V2 Organizer Fee

Add organizer fees simply.

### 7.1 Fee model

Make:

- `createEvent(...)`
- `createEventWithSig(...)`

payable.

Require:

- exact fee payment

Forward:

- to `feeCollector`

Admin controls:

- `setOrganizerEventFee(uint256)`
- `setFeeCollector(address)`

This is intentionally simple.

Do not add:

- variable pricing
- refunds
- discount logic
- subscription logic

before the next release is stable.

## 8. Contract V2 Suggested Interface

Suggested additions:

- `claimAttendanceFor(...)`
- `setOrganizerEventFee(uint256)`
- `setFeeCollector(address)`
- `setRelayer(address,bool)` if you want allowlisted relayers

Suggested events:

- `AttendanceRelayed(address indexed claimer, address indexed relayer, bytes32 indexed eventId, bytes32 uid)`
- `OrganizerEventFeeUpdated(uint256 oldFee, uint256 newFee)`
- `FeeCollectorUpdated(address oldCollector, address newCollector)`
- `ImplementationVersionSet(string versionLabel)` or equivalent app-level tracking if not onchain

## 9. Live Room Challenge

The live room challenge is the next hardening layer for physical presence.

It should not be per-person printed QR codes.

It should be:

- one shared rotating QR
- one shared rotating 6-digit manual code
- refreshed every 20 to 30 seconds

### 9.1 What the room code proves

It proves:

- the attendee saw a live in-room signal at that moment

It does not prove:

- uniqueness
- identity
- wallet ownership by itself

### 9.2 Flow

1. attendee opens event page
2. attendee connects wallet
3. attendee completes the humanity step for the event policy
4. attendee scans or enters the live room code
5. backend redeems that code into a short-lived wallet-bound `challengeToken`
6. `/api/verify-ip` requires the `challengeToken`
7. claim flow continues

### 9.3 Key distinction

- the displayed room code is shared
- the redeemed token is one-time and wallet-bound

That is what makes the UX practical.

### 9.4 Why this matters

This adds a third factor:

- network factor
- location factor
- live challenge factor

That is much stronger than Wi-Fi or GPS alone.

## 10. Live Room Challenge Data Model

Add a table like:

- `event_challenge_redemptions`

Suggested columns:

- `id`
- `event_id`
- `wallet`
- `challenge_nonce`
- `challenge_hash`
- `issued_at`
- `expires_at`
- `redeemed_at`
- `used_at`
- `status`
- `humanity_provider`
- `humanity_nullifier`

Optional:

- `request_ip`
- `user_agent`

for debugging and abuse analysis only if needed.

Keep PII minimal.

## 11. Live Room Challenge Routes

Suggested routes:

- `GET /api/events/challenge/current`
- `POST /api/events/challenge/redeem`

### `GET /api/events/challenge/current`

Used by organizer display mode and optionally attendee sync.

Returns:

- active QR payload
- manual code
- expiry
- next refresh time

### `POST /api/events/challenge/redeem`

Input:

- `eventId`
- `wallet`
- `challengePayload` or manual code
- humanity token or provider result, depending on policy

Output:

- `challengeToken`
- `expiresAt`

Then:

- `/api/verify-ip` consumes `challengeToken`

## 12. Humanity Provider Abstraction

The humanity layer should become provider-based.

Suggested backend interface:

- `verifyHumanity({ provider, eventId, wallet, payload })`

Supported providers later:

- `world`
- `institution`
- `brightid`
- `coinbase`
- `none`

For the hackathon, only `world` needs to be active.

This matters because the contract should not care which provider was accepted.

## 13. World Policy For Now

For the hackathon:

- keep World in the product
- keep it visible
- keep it part of the official proof-of-personhood story

But the implementation should be structured so it can evolve from:

- mandatory everywhere

to:

- required only for some event modes

later.

Do not remove World before the hackathon submission.

## 14. Mobile-First Attendee UX

Once the live room challenge exists, mobile becomes the primary attendee surface.

This means the attendee flow should be designed around:

- QR-first entry
- wallet return/resume
- World return/resume
- clear state after app switching

### 14.1 Required mobile states

The UI must show clear states for:

- opening wallet
- waiting for wallet approval
- wallet connected
- wrong network
- opening World
- waiting for World confirmation
- room code accepted
- checking venue network
- generating proof locally
- claim submitted
- claim confirmed

### 14.2 Technical UX requirements

Implement:

- `focus` resume
- `visibilitychange` resume
- `pageshow` resume
- persisted in-progress state for wallet + World + room challenge

This is mandatory if QR-first check-in is going to feel good on phones.

## 15. Base Account Paymaster Now

Before contract v2 lands, implement gas sponsorship for the path that already fits the current architecture:

- Base Account / smart-wallet users

Use this as a shipping bridge:

- gasless for Base Account
- paid fallback for EOAs until relayed contract v2 lands

This should not be marketed as the final universal sponsorship model.

It is a bridge, not the end state.

## 16. Builder Codes

Builder Codes should be added now.

They are low-risk and low-effort.

Use:

- ERC-8021 transaction attribution
- client-side data suffix append

They do not require a contract rewrite and can be applied to supported transaction flows now.

## 17. Organizer Dashboard

Minimum dashboard requirements:

- events created by organizer wallet
- total claims per event
- unique wallets per event
- humanity-verified claims count
- latest claims
- link to attendee page
- link to check-in display mode

Nice-to-have later:

- export CSV
- claim timeline chart
- claim method breakdown by provider
- archived claim count

## 18. Classroom Roadmap

Classrooms should become a dedicated product mode after the current web3/event path is stable.

### 18.1 Why classrooms are different

A classroom usually needs:

- known student roster
- known class membership
- anti-fake attendance
- minimal lecturer overhead

This is not the same as:

- anonymous community attendance

### 18.2 Institutional identity model

Use:

- student ID
- school-issued credential
- school SSO

Do not use BrightID as the primary classroom identity layer.

For classrooms, the institution already has a trust root.

### 18.3 Classroom flow

Possible future flow:

1. student opens class attendance link
2. signs in with school credential or school-issued wallet
3. scans live room challenge
4. subnet passes
5. ZK proximity proof passes
6. attendance record is issued

Embedded wallets make sense here because most students will not arrive with wallets.

## 19. BrightID Positioning

BrightID is worth exploring later as an optional humanity provider for web3-native users.

It should not be the main critical path before submission.

Why:

- onboarding friction is high
- app install is required
- meaningful verification is not instant
- it is not well suited to first-time event-day onboarding

BrightID is better thought of as:

- a pre-existing social uniqueness credential

not:

- an event-day instant uniqueness system

## 20. Product Positioning Note

Do not pitch WiFiProof only as privacy.

Users often care first about:

- anti-fraud attendance
- ease of check-in
- credible proof
- portability

Privacy should remain central, but it should be presented as:

- a design property
- a differentiator
- not always the first hook

Suggested positioning:

- "harder to fake"
- "easier to verify"
- "portable on-chain attendance"
- "privacy by design"

## 21. Survey Questions

Use these questions to understand how users think about attendance, privacy, and adoption friction.

### Current behavior

1. How do you usually prove attendance at events or classes today?
2. What is the most frustrating part of current check-in methods?
3. Have you ever seen attendance being faked, shared, or bypassed?

### Privacy and trust

4. Which of the following data are you comfortable sharing to prove attendance?
5. Which data do you think organizers usually collect but do not actually need?
6. How important is privacy to you in an attendance system?

### Adoption and UX

7. Would you rather check in with:
   - a wallet
   - email or phone
   - school/work account
   - QR only
   - some combination
8. If gas fees were sponsored, would on-chain attendance feel acceptable to you?
9. What would stop you from using an on-chain attendance system?

### Humanity and uniqueness

10. Would you be willing to use a proof-of-personhood system for one-person-one-claim events?
11. Which uniqueness method would you trust most?
12. For open events, do you care more about privacy, anti-fraud, or convenience?

### Classroom-specific

13. If you are a student or lecturer, what matters most in attendance tracking?
14. Would a school-issued identity be acceptable if the system only revealed attendance and not extra personal data?

### Open response

15. What would make you trust a privacy-preserving attendance system?

## 22. Suggested Execution Order

### Immediate

1. write and review contract v2 interface
2. finalize backend humanity-provider abstraction
3. define live room challenge schema and routes
4. fix mobile-first attendee state machine
5. add Base Account gas sponsorship
6. add Builder Codes
7. add organizer dashboard

### Next

1. implement contract v2
2. deploy proxy-based v2
3. aggregate v1 + v2 stats
4. route new events to v2

### After submission

1. BrightID exploration
2. institutional mode design
3. student identity integration
4. embedded-wallet default onboarding for non-crypto users

## 23. Final Recommendation

The next concrete deliverables should be:

1. contract v2 interface and signature design
2. live room challenge backend design
3. mobile attendee UX spec
4. Base Account sponsorship implementation
5. organizer dashboard MVP

And the most important architectural principle is:

keep the contract generic, keep humanity pluggable, and treat `v1` as history rather than something that must be replaced.
