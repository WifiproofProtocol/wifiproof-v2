# WiFiProof V2 end-to-end checklist

Start with Base Sepolia. Do not use mainnet keys, money, or production identity data until every gate below passes.

## What you need

- GitHub and Vercel
- two Supabase projects: Events and School
- Reown AppKit project
- World Developer Portal project with World ID 4
- three Safe owner wallets for a 2-of-3 Safe
- Base Sepolia deployer and organizer wallets
- Base Sepolia ETH and test USDC
- Base Sepolia EAS schema
- Lit Chipotle account, PKP, action group, and usage key
- Coinbase Developer Platform project and relay smart account
- Self and Coinbase Verified Account only if testing enhanced events

Never paste a service-role key, API secret, wallet secret, RP signing key, Lit key, or deployer key into chat or a `NEXT_PUBLIC_*` variable.

## Current delivery boundary

- The standard web/Base V2 flow is the path to activate now: World ID + venue egress + rotating QR + Noir proximity proof.
- School is ready for a fictional Supabase-backed pilot.
- Self and Coinbase verification adapters exist, but the organizer UI currently creates the standard factor policy (`15`) only. Enhanced-policy selection still needs a small product/code pass before it is an organizer-facing feature.
- World ID 4 works through IDKit in the web app. The World Mini App/MiniKit surface is not yet implemented and must not be submitted to World review as though it were finished.
- Octet remains outside the web V2 launch path.

## 1. Push and create the staging deployment

1. Push `feature/wifiproof-v2-production-foundation` to GitHub.
2. Import the repository into Vercel from the repository root. Do not select `packages/web` as the Vercel root; the root `vercel.json` builds the monorepo.
3. Use the first Vercel URL as the staging origin, for example `https://wifiproof-v2-staging.vercel.app`.
4. WiFiProof currently accepts Vercel's `x-vercel-forwarded-for` header as the trusted production client IP. Use Vercel for the pilot unless `src/lib/trusted-ip.ts` is adapted and tested for another host.

## 2. Prepare the repository locally

```bash
pnpm install --frozen-lockfile
cp packages/web/.env.example packages/web/.env.local
```

Generate each secret separately:

```bash
openssl rand -hex 32
```

Use different values for `EVIDENCE_HMAC_SECRET`, `EVENT_CHALLENGE_SECRET`, `RATE_LIMIT_HMAC_SECRET`, `SCHOOL_NETWORK_HMAC_SECRET`, `HUMANITY_TOKEN_SECRET`, `CRON_SECRET`, and `CLAIM_STATUS_TOKEN_SECRET`.

Set these immediately:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
CHAIN_ID=84532
NEXT_PUBLIC_BASE_RPC_URL=https://YOUR_BASE_SEPOLIA_RPC
BASE_RPC_URL=https://YOUR_BASE_SEPOLIA_RPC
SCHOOL_ALLOW_LOCAL_NETWORK=false
SELF_MOCK_PASSPORT=true
```

Use a dedicated authenticated Base RPC. The public Base endpoint is useful for development but is rate-limited.

In Vercel, set `NEXT_PUBLIC_APP_URL` to the exact HTTPS staging domain instead.

## 3. Create the Events Supabase project

1. Create `WiFiProof Events Sepolia` in Supabase.
2. Copy its URL and server secret into `EVENTS_SUPABASE_URL` and `EVENTS_SUPABASE_SECRET_KEY`.
3. Apply only the Events migrations:

```bash
cd packages/web/supabase-events
npx supabase login
npx supabase link --project-ref YOUR_EVENTS_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
cd ../../..
```

4. Confirm the project contains `events`, `world_verifications`, `self_verifications`, `attendance_evidence`, `event_challenge_audit`, `claim_jobs`, and `api_rate_limits`.
5. Confirm it contains no `school_*` tables.

## 4. Create the School Supabase project

1. Create a different project named `WiFiProof School Pilot`.
2. Copy its URL, publishable key, and server secret into:

```text
NEXT_PUBLIC_SCHOOL_SUPABASE_URL=
NEXT_PUBLIC_SCHOOL_SUPABASE_PUBLISHABLE_KEY=
SCHOOL_SUPABASE_SECRET_KEY=
```

3. In Supabase Authentication, keep email/password enabled and disable public sign-up.
4. Add the staging and production site URLs to the Auth URL configuration.
5. Apply only the School migration:

```bash
cd packages/web/supabase-school
npx supabase login
npx supabase link --project-ref YOUR_SCHOOL_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
cd ../../..
```

6. Load `.env.local` into the current terminal and seed the fictional pilot:

```bash
cd packages/web
set -a
source .env.local
set +a
pnpm seed:school
cd ../..
```

7. Save the printed temporary passwords in a password manager. They are shown only for newly created users.
8. Sign in as the fictional administrator, lecturer, and both students. Each account must be forced to change its temporary password and must see only its authorized records.

## 5. Configure Reown AppKit

1. Create a project in the Reown Dashboard.
2. Add `http://localhost:3000`, the Vercel staging domain, and the final production domain to allowed domains.
3. Copy the project ID into `NEXT_PUBLIC_REOWN_PROJECT_ID`.
4. Verify that Connect Wallet opens and Base Sepolia is the selected network.

## 6. Configure World ID 4

1. Create or upgrade the WiFiProof app in the World Developer Portal.
2. Configure a World ID 4 relying party.
3. Save the RP private signing key immediately when it is shown. It belongs in `RP_SIGNING_KEY` only.
4. Set:

```text
NEXT_PUBLIC_WORLD_APP_ID=app_YOUR_ID
NEXT_PUBLIC_WORLD_RP_ID=rp_YOUR_ID
RP_ID=rp_YOUR_ID
RP_SIGNING_KEY=YOUR_SERVER_ONLY_SIGNING_KEY
WORLD_CLIENT_SECRET=YOUR_SERVER_ONLY_CLIENT_SECRET
NEXT_PUBLIC_WORLD_ACTION_ID=wifiproof-attendance
WORLD_ACTION_ID=wifiproof-attendance
```

5. Add staging and production domains in the portal.
6. WiFiProof derives a separate short-lived action from each event ID. It uses a one-time uniqueness proof, not a persistent World session identity.
7. Test `POST /api/world/rp-context` only after an event exists. A successful response contains an event-scoped action and signed `rp_context`.

## 7. Create the Safe and EAS schema

1. Create a Base Sepolia Safe with three independently controlled owners and threshold 2.
2. Test a harmless two-signature transaction.
3. Use the Safe as `OWNER_ADDRESS` and, for the pilot, `TREASURY_ADDRESS`.
4. On Base Sepolia EASSCAN register this exact non-revocable schema with no resolver:

```text
bytes32 eventId,bytes32 attendanceNullifier,bytes32 policyHash,bytes32 evidenceCommitment,uint32 factorBitmap,uint64 verifiedAt
```

5. Save its UID as `WIFIPROOF_V2_SCHEMA`. Base Sepolia's EAS contract is `0x4200000000000000000000000000000000000021`.

## 8. Provision Lit phase A

1. Open the current Lit Chipotle Dashboard.
2. Create an account, copy the account key once, and store it in a password manager. Do not deploy the account key.
3. Fund the Lit account.
4. Create a PKP named `wifiproof-sepolia-authorizer`.
5. Save the PKP ID and signer address:

```text
LIT_PKP_ID=
LIT_PKP_SIGNER_ADDRESS=
ATTENDANCE_AUTHORIZER_ADDRESS=the same PKP signer address
```

Do not create the final Action CID yet; its source must contain the deployed WiFiProofV2 address.

## 9. Provision the CDP relay phase A

1. Create a dedicated CDP project.
2. Create a Secret API Key and Wallet Secret and store:

```text
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
CDP_WALLET_SECRET=
```

3. Create or obtain the named owner and smart account used by the application:

```text
CDP_RELAY_OWNER_NAME=wifiproof-relay-owner
CDP_RELAY_ACCOUNT_NAME=wifiproof-attendance-relay
```

4. Save the smart-account address as `CDP_RELAY_ADDRESS` for contract deployment.
5. The final restrictive policy is added after the protocol contract address exists.

## 10. Fund test accounts

1. Fund the deployer with Base Sepolia ETH.
2. Fund the organizer with Base Sepolia ETH and at least 5 test USDC.
3. The standard Base Sepolia USDC address used by the deployment is `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
4. Import the deployer into Foundry's encrypted keystore:

```bash
cast wallet import wifiproof-deployer --interactive
```

## 11. Deploy WiFiProofV2

Create an uncommitted `packages/contracts/.env.local` containing:

```text
EAS_ADDRESS=0x4200000000000000000000000000000000000021
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
TREASURY_ADDRESS=YOUR_SAFE
ATTENDANCE_AUTHORIZER_ADDRESS=YOUR_LIT_PKP_SIGNER
CDP_RELAY_ADDRESS=YOUR_CDP_SMART_ACCOUNT
OWNER_ADDRESS=YOUR_SAFE
WIFIPROOF_V2_SCHEMA=YOUR_SCHEMA_UID
EVENT_CREATION_FEE=5000000
```

Then deploy:

```bash
cd packages/contracts
set -a
source .env.local
set +a
forge clean
forge build
forge test --offline -vv
forge script script/DeployV2.s.sol:DeployV2 \
  --rpc-url https://sepolia.base.org \
  --account wifiproof-deployer \
  --broadcast \
  --verify
cd ../..
```

Save the emitted HonkVerifier and WiFiProofV2 addresses. Put the V2 address into both `NEXT_PUBLIC_WIFIPROOF_V2_ADDRESS` and `WIFIPROOF_V2_ADDRESS`.

## 12. Finish Lit phase B

1. Open `packages/web/lit-actions/sign-attendance.js`.
2. Set `ALLOWED_CHAIN_ID` to `84532` for Base Sepolia.
3. Replace the zero address in `ALLOWED_VERIFYING_CONTRACT` with the deployed WiFiProofV2 address.
4. Review the exact final file, then pin that immutable file to IPFS.
5. Register the CID in Lit.
6. Create one group containing only this CID and the Sepolia PKP.
7. Create a usage key whose only permission is execution in that exact group. Do not use wildcard group `0`.
8. Set:

```text
SIGNER_MODE=lit
LIT_NETWORK=chipotle
LIT_API_BASE_URL=https://api.chipotle.litprotocol.com/core/v1
LIT_USAGE_API_KEY=
LIT_ACTION_IPFS_CID=
```

9. Enable `ENABLE_DEV_TEST_PAGES=true` only on a protected staging deployment, open `/dev/lit-signer-test`, and confirm the recovered signer equals `LIT_PKP_SIGNER_ADDRESS`. Disable the page afterward.

## 13. Finish the CDP policy

Create and attach an account-scoped policy to the relay smart account that permits only:

- network `base-sepolia`
- destination equal to the deployed WiFiProofV2 contract
- ETH value `0`
- `claimAttendanceFor` calldata only

Reject transfers, other contracts, other functions, message signing, hash signing, and arbitrary typed-data signing. Keep `CDP_REQUIRE_ACCOUNT_POLICY=true`. Run one negative call to another contract and confirm CDP rejects it.

## 14. Complete Vercel secrets and redeploy

Copy every required V2 value from `packages/web/.env.example` into Vercel. The only public values are those beginning with `NEXT_PUBLIC_`. Keep all other values encrypted and server-only.

Redeploy, then verify:

```text
/                         landing page
/organizer                organizer dashboard
/organizer/setup          event setup
/events                   event explorer
/school                   private School sign-in
```

Do not configure Privy, Storacha, the prototype contract, or the legacy paymaster for the V2 pilot. Those variables belong to retired compatibility paths, not the standard V2 flow.

## 15. Configure retry and retention operations

1. Schedule an authenticated POST to `/api/internal/claims/process` every few minutes with `Authorization: Bearer YOUR_CRON_SECRET`.
2. Configure a daily Events-database job to call `select prune_wifiproof_evidence();` using a server-only/Supabase-controlled scheduler.
3. Alert when a claim job remains pending or failed beyond the expected relay window.

## 16. Test School end to end

1. Lecturer and student must use the same public network egress.
2. Sign in as the lecturer and open a 10-minute fictional class session.
3. In another browser profile, sign in as an enrolled fictional student and record attendance.
4. Confirm the five gates pass: authenticated student, enrolment, live session, matching network, no duplicate.
5. Retry as the same student and confirm the result is duplicate, not a second row.
6. Sign in as another student, lecturer, and administrator and confirm every RLS visibility boundary.
7. Repeat once from a different network and confirm the network gate fails.

For local-only UI testing, set `SCHOOL_ALLOW_LOCAL_NETWORK=true`; never use that setting in staging or production.

## 17. Test Events end to end

1. Put the organizer device on the real venue Wi-Fi.
2. Open `/organizer/setup`, connect the funded organizer wallet, capture the venue coordinates, select the exact detected egress CIDR, and create the event.
3. Approve 5 test USDC, then confirm the `createEvent` transaction.
4. Keep the rotating QR display open inside the venue.
5. On a second phone, join the same venue Wi-Fi and scan the current QR.
6. Connect an attendee wallet, complete World ID, allow browser location, generate the Noir proof, and submit.
7. Confirm the client reaches `confirmed`, the transaction comes from the CDP relay, `AttendanceClaimed` is emitted, and the EAS recipient is the WiFiProof contract rather than the attendee wallet.
8. Retry with the same World human and confirm duplicate prevention.
9. Test stale QR, remote network, outside-radius coordinates, expired event, altered event ID/public inputs, and a stopped relay. Each failure must be explicit and must not consume the onchain nullifier.

## 18. Optional enhanced factors

- First add organizer policy controls so an event can explicitly set factor bit `16` for Self and/or bit `32` for Coinbase instead of always submitting `15`.
- Self: use a public HTTPS callback, keep frontend/backend scopes identical, use mock passport only in staging, and set `SELF_MOCK_PASSPORT=false` for real documents.
- Coinbase: provide `COINBASE_VERIFICATION_BASE_RPC_URL` for Base mainnet and test both a wallet with and without the official Verified Account attestation.
- Octet: do not add it to this web release. It remains a later native iOS/Android assurance tier.

## 19. Release gate

Run:

```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
pnpm circuit:test
pnpm circuit:compile
pnpm contracts:test
```

Before mainnet, also require credentialed Playwright tests, real RLS matrix tests, dependency and secret scans, monitoring, backups/recovery, and independent contract/security review.

Only after all Sepolia gates pass should you repeat the entire setup with fresh production databases, Safe, schema, Lit group/key, CDP policy, RPC, and Base mainnet contract.

## 20. World Mini App follow-up

After the standard web/Base pilot is stable:

1. Add MiniKit initialization and World WebView capability handling to the web application.
2. Keep Base claim submission on the sponsored CDP relay; do not route it through a World Chain transaction command.
3. Test camera QR scanning, geolocation permissions, interruption recovery, and the full claim flow inside World App on iOS and Android.
4. Add complete store metadata, privacy/support URLs, and required images in the World Developer Portal.
5. Submit only after the integration is live, testable, and no longer presented as a demo or beta.
