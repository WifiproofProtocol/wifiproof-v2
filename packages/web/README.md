# @wifiproof/web

Next.js frontend + API routes for WiFiProof V2.

## Core Flows

1. Organizer creates an event and stores metadata in Supabase.
2. Attendee verifies humanity (World), subnet presence, and ZK location proof.
3. Attendee claims attendance on `WiFiProof` contract.
4. Claim metadata is archived to decentralized storage (Storacha) and indexed in Supabase.

## Required Environment Variables

### Public (client)
- `NEXT_PUBLIC_BASE_RPC_URL`
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
- `IP_SIGNER_PRIVATE_KEY`
- `EVENT_SIGNER_PRIVATE_KEY` (optional fallback to IP signer)
- `WORLD_CLIENT_SECRET` (optional, depending on World verify configuration)
- `WORLD_TOKEN_SECRET`
- `WORLD_TOKEN_TTL_SECONDS` (optional, default `900`)
- `WORLD_APP_ID` (optional server override)
- `WORLD_ACTION_ID` (optional server override)
- `RP_ID` (recommended; from World developer console)
- `RP_SIGNING_KEY` (recommended; signer key downloaded from World)
- `STORACHA_KEY` (agent private key, starts with `Mg...`)
- `STORACHA_PROOF` (base64 delegation proof from CLI)
- `STORACHA_SPACE_DID` (optional safety check)

## API Routes Added for PL_Genesis

- `POST /api/world/verify`
  - Verifies World proof server-side
  - Enforces one nullifier per event
  - Issues short-lived `worldToken`

- `POST /api/world/rp-context`
  - Generates signed RP context (`nonce`, `created_at`, `expires_at`, `signature`)
  - Used by IDKit v4 request flow

- `POST /api/verify-ip`
  - Requires valid `worldToken`
  - Checks subnet and event time window
  - Returns EIP-712 IP signature

- `POST /api/claims/archive`
  - Uploads claim artifact to Storacha
  - Persists CID + metadata in `attendance_artifacts`

- `GET /api/claims/[eventId]/[wallet]`
  - Returns latest archived artifact row for demo/audit

## Local Development

```bash
pnpm --filter web dev
```

## Typecheck / Lint

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec eslint 'src/lib/world.ts' 'src/lib/storacha.ts' 'src/app/api/world/verify/route.ts' 'src/app/api/verify-ip/route.ts' 'src/app/api/claims/archive/route.ts' 'src/app/api/claims/[eventId]/[wallet]/route.ts' 'src/app/event/[eventId]/EventClient.tsx'
```
