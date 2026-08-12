# WiFiProof V2 deployment runbook

This is the exact order for a Base Sepolia pilot. Do not begin mainnet until the Sepolia release gates pass and an independent reviewer has checked the contract and signer boundaries.

## 0. Prepare local configuration

1. Install Node 20+, pnpm 10, Foundry, Noir/Nargo, Barretenberg, Docker, and the Supabase CLI.
2. From the repository root, run `pnpm install`.
3. Copy `packages/web/.env.example` to `packages/web/.env.local`.
4. Generate every HMAC secret independently with a password manager or `openssl rand -hex 32`. Never reuse one secret for two fields.
5. Never paste a service-role key, Lit key, CDP key, World signing key, wallet secret, or deployer key into a `NEXT_PUBLIC_*` variable.

## 1. Create the Events Supabase project

1. In the Supabase dashboard, select **New project**.
2. Name it `WiFiProof Events Sepolia` and choose the region nearest the web deployment.
3. Save the database password in a password manager.
4. In **Project Settings → API**, copy the project URL to `EVENTS_SUPABASE_URL`.
5. Copy the server secret/service-role key to `EVENTS_SUPABASE_SECRET_KEY`. This key is server-only.
6. Do not enable Supabase Auth providers in this project. Events has no roster or user table.
7. Apply only the Events migrations:

```bash
cd packages/web/supabase-events
npx supabase login
npx supabase link --project-ref YOUR_EVENTS_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

8. In Supabase Table Editor, confirm `events`, `attendance_evidence`, `event_challenges`, `claim_jobs`, `api_rate_limits`, and provider-verification tables exist.
9. Confirm there are no `school_*` tables.

Official reference: [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

## 2. Create the School Supabase project

1. Create a second project named `WiFiProof School Pilot`.
2. Use a different database password and keep the project independent from Events.
3. In **Project Settings → API**, set:
   - project URL → `NEXT_PUBLIC_SCHOOL_SUPABASE_URL`
   - publishable key → `NEXT_PUBLIC_SCHOOL_SUPABASE_PUBLISHABLE_KEY`
   - server secret/service-role key → `SCHOOL_SUPABASE_SECRET_KEY`
4. In **Authentication → Providers → Email**, disable public user sign-up. Keep email/password sign-in enabled.
5. Set the production Site URL and add localhost/staging redirect URLs. Do not use wildcard production redirects.
6. Apply only the School migration:

```bash
cd packages/web/supabase-school
npx supabase login
npx supabase link --project-ref YOUR_SCHOOL_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

7. Confirm the project contains the eight `school_*` tables and no event-evidence or relay tables.
8. From the repository root, seed the fictional pilot:

```bash
NEXT_PUBLIC_SCHOOL_SUPABASE_URL='https://YOUR_PROJECT.supabase.co' \
SCHOOL_SUPABASE_SECRET_KEY='YOUR_SERVER_SECRET' \
pnpm --filter web seed:school
```

9. Store the one-time temporary passwords immediately. The seeded users are fictional and must change password after first sign-in.
10. Sign in separately as the fictional student, lecturer, and administrator and confirm each role sees only its permitted records.

Official references: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 3. Configure World ID 4

1. Open the World Developer Portal and create or upgrade the WiFiProof relying party to World ID 4.
2. Copy the relying-party ID to `RP_ID`.
3. Generate the RP signing key in the portal. It is displayed once; store it as `RP_SIGNING_KEY` in server secrets.
4. Set the public app identifier as `NEXT_PUBLIC_WORLD_APP_ID`.
5. If the portal issues a verifier client secret, store it as `WORLD_CLIENT_SECRET`.
6. Set `WORLD_ACTION_ID=wifiproof-attendance`. The server derives a distinct signed action from this prefix and each event ID.
7. Set `HUMANITY_TOKEN_SECRET` to a new random 32-byte secret.
8. Add the production and staging domains to the relying party.
9. Test `/api/world/rp-context` and verify that it returns a short-lived signed `rp_context`; never expose `RP_SIGNING_KEY` to the browser.
10. Complete one proof and confirm `/api/world/verify` persists the event/action/nullifier atomically. Reusing the same World proof for the event must return a duplicate error.

WiFiProof uses one-time uniqueness proofs, not World session identity. The backend forwards the IDKit result unchanged to `POST /api/v4/verify/{rp_id}`. See [World ID 4 migration](https://docs.world.org/world-id/4-0-migration) and [v4 verification](https://docs.world.org/api-reference/developer-portal/verify).

## 4. Configure optional Self verification

1. Choose a stable scope of 30 characters or fewer, for example `wifiproof-humanity`, and set `SELF_SCOPE`.
2. Deploy the web app or expose local development with a secure public tunnel. Self’s relayer cannot call localhost.
3. The backend endpoint is `https://YOUR_DOMAIN/api/humanity/self`.
4. Keep `SELF_MOCK_PASSPORT=true` only in a test environment. Remove it or set it to `false` for real documents.
5. Keep personal disclosures disabled. The current flow asks for a nullifier only and does not request name, passport number, nationality, birth date, or gender.
6. Ensure the frontend `SelfAppBuilder` scope, endpoint, user ID type, and disclosures exactly match the backend verifier configuration.
7. Complete a Self QR verification, then confirm a second GET to `/api/humanity/self?wallet=...&eventId=...` returns only a short-lived provider receipt.

References: [Self quickstart](https://docs.self.xyz/use-self/quickstart) and [backend verifier](https://docs.self.xyz/backend-integration/basic-integration).

## 5. Configure Coinbase Verified Account

1. Coinbase Verified Account attestations are read from Base mainnet even when the WiFiProof pilot is on Base Sepolia.
2. Set a reliable Base mainnet RPC as `COINBASE_VERIFICATION_BASE_RPC_URL`.
3. Keep the official Base mainnet EAS, indexer, schema UID, and Coinbase attester constants in `src/app/api/humanity/coinbase/route.ts` unless Coinbase publishes a migration.
4. Test with a wallet that has a valid Coinbase Verified Account attestation and one without it.
5. Confirm the route checks recipient, schema, attester, revocation time, and expiration before issuing an event-scoped subject hash.
6. Do not store the wallet’s raw Coinbase subject as the attendance nullifier.

This is an optional second factor. It never replaces World ID.

## 6. Create the 2-of-3 Safe

1. Choose three independently controlled signer wallets. At least two should use hardware-backed signing and they should not share the same recovery phrase.
2. Open the official Safe app on Base Sepolia.
3. Create a Safe with all three owners and a threshold of 2.
4. Have a second owner confirm the setup and test one harmless two-signature transaction.
5. Save the Safe address as `OWNER_ADDRESS` and `TREASURY_ADDRESS` for the pilot, or use a separate treasury Safe if desired.
6. The Safe will control fee, treasury, authorizer, schema, relayer, and pause configuration after deployment.

Safe recommends a threshold greater than one so a single account cannot execute administrative changes. See [Safe setup guidance](https://help.safe.global/articles/1038062742-what-safe-setup-should-i-use).

## 7. Create the anonymous EAS schema

1. Open the Base Sepolia EAS Schema Builder.
2. Register this exact non-revocable schema with no resolver:

```text
bytes32 eventId,bytes32 attendanceNullifier,bytes32 policyHash,bytes32 evidenceCommitment,uint32 factorBitmap,uint64 verifiedAt
```

3. Copy the returned schema UID to `WIFIPROOF_V2_SCHEMA` for contract deployment and `EAS_SCHEMA_UID` for the web deployment.
4. Set Base Sepolia’s EAS contract address as `EAS_ADDRESS`.
5. The protocol contract is the attestation recipient. Never put the attendee wallet in the EAS recipient field or schema data.

Reference: [Create an EAS schema](https://docs.attest.org/docs/tutorials/create-a-schema).

## 8. Create and restrict the CDP relay

1. Create a Coinbase Developer Platform project dedicated to the relay.
2. Create a Secret API Key and Wallet Secret. Set `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` only in server secrets.
3. Set `CDP_RELAY_OWNER_NAME=wifiproof-relay-owner` and `CDP_RELAY_ACCOUNT_NAME=wifiproof-attendance-relay`.
4. Run the relay once in a protected setup environment or use a small setup script with the same names to create the EOA owner and smart account.
5. Copy the smart-account address to `CDP_RELAY_ADDRESS` for deployment and later to `WIFIPROOF_V2` configuration.
6. Create an account-scoped policy for `sendUserOperation` that accepts only:
   - network `base-sepolia` during the pilot (`base` for mainnet),
   - destination equal to the deployed WiFiProofV2 address,
   - ETH value equal to zero,
   - function `claimAttendanceFor` only.
7. Reject or omit every other operation. Do not permit arbitrary message, hash, or typed-data signing.
8. Attach the policy to the relay account and set `CDP_REQUIRE_ACCOUNT_POLICY=true`.
9. Set `CRON_SECRET` and `CLAIM_STATUS_TOKEN_SECRET` to independent random values.
10. Test a valid claim, then test a transfer and a call to another contract. Both negative tests must be rejected by CDP before mainnet.

CDP policies support account scope, address/network/value criteria, and `evmData` function restrictions. See [Policy Engine](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/policy-engine/policy-engine) and [server smart accounts](https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/managing-accounts).

## 9. Configure the current Lit signer

Do not reuse the old Naga/EOA setup for production. Follow `docs/LIT_MIGRATION.md` after the V2 contract address is known. The short version is:

1. Create and fund a Chipotle account.
2. Create one PKP.
3. Put the final contract address into `packages/web/lit-actions/sign-attendance.js`.
4. Pin that exact file to IPFS and copy its CID.
5. Create a Group containing only that CID and PKP.
6. Create an execute-only usage key scoped to that Group; never use wildcard group `0`.
7. Set `LIT_NETWORK=chipotle`, `LIT_USAGE_API_KEY`, `LIT_PKP_ID`, `LIT_PKP_SIGNER_ADDRESS`, and `LIT_ACTION_IPFS_CID`.
8. Set the contract authorizer to the PKP signer address through the Safe.

Reference: [Lit Chipotle quickstart](https://developer.litprotocol.com/quickstart).

## 10. Deploy WiFiProofV2 on Base Sepolia

1. Get Base Sepolia ETH for the deployer and test USDC for organizer flow tests.
2. Import the deployer into Foundry’s encrypted keystore when possible: `cast wallet import wifiproof-deployer --interactive`.
3. Set the deployment values in an uncommitted environment file:
   - `EAS_ADDRESS`
   - Base Sepolia `USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - `TREASURY_ADDRESS`
   - `ATTENDANCE_AUTHORIZER_ADDRESS` (Lit PKP signer)
   - `CDP_RELAY_ADDRESS`
   - `OWNER_ADDRESS` (2-of-3 Safe)
   - `WIFIPROOF_V2_SCHEMA`
   - `EVENT_CREATION_FEE=5000000`
4. Run all contract tests:

```bash
cd packages/contracts
forge clean
forge build
forge test --offline -vv
```

5. Deploy and verify:

```bash
forge script script/DeployV2.s.sol:DeployV2 \
  --rpc-url https://sepolia.base.org \
  --account wifiproof-deployer \
  --broadcast \
  --verify
```

6. Copy the emitted verifier and WiFiProofV2 addresses. Set `NEXT_PUBLIC_WIFIPROOF_V2_ADDRESS` and `WIFIPROOF_V2_ADDRESS` to the V2 address.
7. Read every constructor value with `cast call` and compare it to the runbook before funding the organizer flow.
8. Confirm ownership belongs to the Safe and the event fee is `5_000_000`.

Base’s official Foundry guide recommends encrypted keystores and verifies the deployed contract. See [Base contract deployment](https://docs.base.org/apps/quickstart/build-app).

## 11. Configure deployment secrets

1. Add every value from `packages/web/.env.example` to the deployment provider.
2. Mark all unprefixed secrets as server-only.
3. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.
4. Set `CHAIN_ID=84532` for Sepolia and use a dedicated `BASE_RPC_URL`.
5. Configure the protected scheduled worker to POST `/api/internal/claims/process` with the worker secret. Do not expose this route publicly without authentication.
6. Deploy preview, then production. Confirm no secret value appears in client JavaScript or build logs.

## 12. Run release verification

1. Run local gates:

```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
pnpm circuit:test
pnpm circuit:compile
pnpm contracts:test
```

2. Install Playwright only after the credentialed staging environment exists:

```bash
pnpm --filter web add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

3. Configure `baseURL` to staging and use dedicated fictional School users and funded test wallets.
4. Run the organizer fee/create flow, standard four-factor claim, optional Self/Coinbase policies, and all negative cases in the V2 plan.
5. Run School student, lecturer, and administrator isolation tests.
6. Confirm retries do not submit a second onchain claim.
7. Review structured logs for raw IPs, coordinates, proof documents, access tokens, or secrets. None may be logged.
8. Complete accessibility, performance, secret scanning, dependency review, and independent security review before mainnet.

Playwright can start or target a web server with its `webServer` and `baseURL` configuration. See [Playwright web server](https://playwright.dev/docs/test-webserver).

## 13. Mainnet cutover

1. Repeat this runbook with fresh production Supabase projects, keys, Safe, EAS schema, Lit Group/key, and CDP account policy.
2. Change `CHAIN_ID` to `8453`, RPC to Base mainnet, and USDC to Base mainnet USDC.
3. Re-pin the Lit Action after setting the final mainnet contract address; a Sepolia action must never authorize mainnet.
4. Run a limited event with a capped organizer cohort.
5. Monitor relay balance, claim-job age, provider errors, World duplicates, and unusual claim volume.
6. Keep emergency pause under the Safe and publish `SECURITY.md` before opening public event creation.
