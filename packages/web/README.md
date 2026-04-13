# @wifiproof/web

Next.js frontend + API routes for WiFiProof V2.

## Core Flows

1. Organizer creates an event and stores metadata in Supabase.
2. Attendee verifies humanity with World ID or Coinbase Verified, then proves subnet presence and ZK location.
3. Attendee claims attendance on `WiFiProof` contract.
4. Optional claim archival can happen after settlement, while the core flow stays focused on the onchain attestation.

## Required Environment Variables

### Public (client)
- `NEXT_PUBLIC_BASE_RPC_URL`
- `NEXT_PUBLIC_BASE_BUILDER_CODE` (optional ERC-8021 Builder Code for Base attribution)
- `NEXT_PUBLIC_WIFIPROOF_ADDRESS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WORLD_APP_ID`
- `NEXT_PUBLIC_WORLD_ACTION_ID`

### Server-only
- `SUPABASE_SERVICE_ROLE_KEY`
- `WIFIPROOF_ADDRESS`
- `VERIFIER_ADDRESS`
- `BASE_RPC_URL`
- `CHAIN_ID`
- `CDP_PAYMASTER_URL` (optional; server-side CDP paymaster endpoint used by `/api/paymaster`)
- `SIGNER_MODE` (`key` or `lit`; default `key`)
- `IP_SIGNER_PRIVATE_KEY`
- `EVENT_SIGNER_PRIVATE_KEY` (optional fallback to IP signer)
- `LIT_NETWORK` (optional; `chipotle` or legacy Naga variants, default `naga-test`)
- `LIT_CHIPOTLE_API_KEY` (required when `SIGNER_MODE=lit` and `LIT_NETWORK=chipotle`)
- `LIT_CHIPOTLE_PKP_ADDRESS` (required when `SIGNER_MODE=lit` and `LIT_NETWORK=chipotle`)
- `LIT_CHIPOTLE_API_BASE_URL` (optional override; default `https://api.dev.litprotocol.com/core/v1`)
- `LIT_PKP_SIGNER_ADDRESS` (optional expected signer address; also used as a fallback alias for `LIT_CHIPOTLE_PKP_ADDRESS`)
- `LIT_PKP_PUBLIC_KEY` (required only for legacy Naga mode)
- `LIT_EOA_PRIVATE_KEY` (required only for legacy Naga mode)
- `LIT_AUTH_STORAGE_PATH` (optional, default `/tmp/wifiproof-lit-auth`)
- `LIT_APP_NAME` (optional, default `wifiproof`)
- `LIT_AUTH_DOMAIN` (optional, default `wifiproof.xyz`)
- `LIT_AUTH_STATEMENT` (optional SIWE statement)
- `SIGNER_FALLBACK_TO_KEY` (optional; default `true`, fallback to local key if Lit signing fails)
- `WORLD_CLIENT_SECRET` (optional, depending on World verify configuration)
- `HUMANITY_TOKEN_SECRET` (optional alias for `WORLD_TOKEN_SECRET`)
- `WORLD_TOKEN_SECRET`
- `WORLD_TOKEN_TTL_SECONDS` (optional, default `900`)
- `WORLD_APP_ID` (optional server override)
- `WORLD_ACTION_ID` (optional server override)
- `RP_ID` (recommended; from World developer console)
- `RP_SIGNING_KEY` (recommended; signer key downloaded from World)
- `STORACHA_KEY` (optional archival only; agent private key, starts with `Mg...`)
- `STORACHA_PROOF` (optional archival only; base64 delegation proof from CLI)
- `STORACHA_SPACE_DID` (optional archival safety check)

If you enable smart-wallet gas sponsorship, set the paymaster endpoint in your local server env only:

```env
CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/<your-client-api-key>
```

Do not expose this as `NEXT_PUBLIC_*` or commit the live value to the repo.

## API Routes

- `POST /api/world/verify`
  - Verifies World proof server-side
  - Enforces one nullifier per event
  - Issues a short-lived humanity token

- `POST /api/world/rp-context`
  - Generates signed RP context (`nonce`, `created_at`, `expires_at`, `signature`)
  - Used by IDKit v4 request flow

- `POST /api/humanity/coinbase`
  - Checks whether the connected wallet has a valid Coinbase Verified attestation on Base
  - Issues a short-lived humanity token

- `POST /api/verify-ip`
  - Requires a valid humanity token
  - Checks subnet and event time window
  - Returns EIP-712 IP signature

- `POST /api/claims/archive`
  - Uploads claim artifact to optional archival storage
  - Persists CID + metadata in `attendance_artifacts`

- `GET /api/claims/[eventId]/[wallet]`
  - Returns latest archived artifact row for demo/audit

## Signer Modes

- `SIGNER_MODE=key`:
  - Uses `IP_SIGNER_PRIVATE_KEY` / `EVENT_SIGNER_PRIVATE_KEY` directly.
- `SIGNER_MODE=lit`:
  - `LIT_NETWORK=chipotle`: signs through Lit Core V1 / Chipotle with a PKP-backed Lit Action.
  - `LIT_NETWORK=naga-*`: uses the legacy Naga PKP signer flow in `src/lib/lit-signer.ts`.
  - If `SIGNER_FALLBACK_TO_KEY` is not set to `false`, the app falls back to the local key path when Lit is unavailable.
  - The returned signature is verified server-side before use.

## Local Development

```bash
pnpm --filter web dev
```

### Dev-only Storacha Archive Tester

- Open: `http://localhost:3000/dev/archive-test`
- Purpose: manually post a payload to `POST /api/claims/archive` and confirm CID archival.
- This page is hidden in non-dev builds unless `ENABLE_DEV_TEST_PAGES=true`.

## Typecheck / Lint

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec eslint 'src/lib/world.ts' 'src/lib/storacha.ts' 'src/app/api/world/verify/route.ts' 'src/app/api/verify-ip/route.ts' 'src/app/api/claims/archive/route.ts' 'src/app/api/claims/[eventId]/[wallet]/route.ts' 'src/app/event/[eventId]/EventClient.tsx'
```
