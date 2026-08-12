# WiFiProof Security

## Supported security claim

For a standard V2 event, WiFiProof asserts that one event-scoped World identity completed the configured evidence policy during the event window and that the submitted Noir proof verified against the immutable event policy.

It does not assert that:

- the browser cryptographically identified an SSID;
- browser geolocation was hardware-attested or impossible to spoof;
- the same person carried the device throughout the flow;
- a venue operator, authorizer, World, or network provider was honest;
- School attendance is anonymous to the institution.

## Trust boundaries

- **World ID:** unique-human evidence. Public attendance nullifiers are separately event-scoped before publication.
- **Browser:** creates the private witness. A malicious browser can supply false coordinates; the circuit only proves the supplied coordinates satisfy the radius statement.
- **Venue operator:** controls event metadata, approved egress CIDRs and the rotating QR display.
- **Evidence authorizer:** validates provider receipts and derived venue evidence, then signs a short-lived EIP-712 authorization. It cannot forge a valid Noir proof.
- **CDP relay:** pays gas and submits a pre-encoded claim. It cannot alter a signed authorization and should be constrained by an account policy.
- **WiFiProofV2:** enforces the event policy, deadline, factor bitmap, event-scoped nullifier, public-input commitment, authorization signature and Noir proof.
- **Safe:** controls fee, treasury, authorizer, relayer, schema and emergency pause. It cannot upgrade core verification logic.
- **Supabase:** stores event metadata, derived evidence, relay jobs and private institution records. School access depends on Auth and RLS being configured correctly.

## Threats and controls

| Threat | Primary control | Residual risk |
|---|---|---|
| Forwarded static QR | 30-second signed challenge, accepted for at most 60 seconds | Live video or challenge relaying |
| Prefix/IP confusion | Parsed IPv4/IPv6 CIDR matching and trusted proxy headers | VPN or proxy exiting through the venue |
| Duplicate human | Atomic `(event, World nullifier)` persistence and onchain event nullifier | Provider compromise or device handoff |
| Cross-event proof replay | Public event input constrained in Noir and checked against event policy | None expected if verifier/artifacts match |
| Field wraparound | Signed `i64` coordinates, `u64` threshold and explicit geographic ranges | Euclidean approximation near unusual geography |
| Authorizer forgery | Onchain Noir verification, short deadlines and signer rotation | Authorizer can approve false non-location factors |
| Relay abuse | Fixed destination/method encoding, CDP policy, idempotent jobs and attempt limits | Incorrect or missing portal policy |
| School roster exposure | Invite-only Auth, cookie SSR client, no public account selector and RLS | Service-role misuse or incorrect production migration |
| Direct School insert bypass | Security-definer attendance RPC rechecks role, enrolment, window and network fingerprint | Institution administrators remain trusted |

## Data minimization and retention

- Exact client IP addresses are never persisted. Network evidence is an HMAC fingerprint.
- Attendee private coordinates remain in the browser witness. Event coordinates are public policy inputs.
- Event evidence contains flags, provider-derived pseudonyms, proof/challenge hashes and timestamps.
- Derived attendance evidence is retained for 30 days.
- QR challenge audit rows are retained for 24 hours.
- Redacted operational/security logs should be retained for no more than 14 days.
- Completed and terminal relay jobs are retained for 30 days.
- School retention and deletion rules must be approved by each institution before real data is imported.

## Key and role responsibilities

- The production authorizer must use Lit PKP or an equivalent managed KMS. `ATTENDANCE_AUTHORIZER_PRIVATE_KEY` is development-only and production code refuses key mode.
- The contract owner must be a 2-of-3 Safe with independent signers.
- The treasury should be a separate Safe-controlled address.
- CDP API credentials, wallet secret, Supabase secret key and HMAC secrets must remain server-only.
- Rotate the authorizer or relay immediately after suspected compromise and pause claims while evidence is reviewed.
- Never expose a secret or service-role key through `NEXT_PUBLIC_*`, client bundles, support screenshots or committed environment files.

## Mainnet release gates

- Clean web lint, deterministic production build, web unit tests, Noir tests and Foundry unit/fuzz/invariant tests.
- Clean-database migration run plus automated anonymous, student, lecturer and administrator RLS boundary tests.
- Playwright coverage for paid event creation, four-factor claim, enhanced factors, remote IP, stale QR, duplicate human, malformed proof, expired event, failed relay and private School access.
- CDP policy review, Safe signer rehearsal, relay-balance monitoring and provider-outage alerts.
- Independent review before mainnet USDC handling.

## Reporting a vulnerability

Use the repository's private GitHub Security Advisory flow. Include affected commit, reproduction steps, impact and any suggested mitigation. Do not disclose an unpatched vulnerability publicly or include real user data, credentials or private proofs in a report.
