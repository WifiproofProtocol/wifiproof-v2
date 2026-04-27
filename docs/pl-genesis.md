# PL_Genesis Existing Code Delta

## What Was Added

### World integration
- `POST /api/world/verify` to verify proof-of-humanity server-side
- Signed short-lived world token (`WORLD_TOKEN_SECRET`)
- `POST /api/verify-ip` now requires `worldToken`
- Event check-in UI now blocks claiming until humanity verification is complete

### Decentralized artifact archival
- `POST /api/claims/archive`
- `GET /api/claims/[eventId]/[wallet]`
- Supabase tables:
  - `world_verifications`
  - `attendance_artifacts`

### Database migration
- `20260309000000_add_world_and_artifacts.sql`
  - adds missing `events` geodata columns
  - creates `world_verifications`
  - creates `attendance_artifacts`

## Demo Script (2-3 minutes)

1. Open event check-in page and connect wallet.
2. Verify World proof payload.
3. Submit claim and show tx confirmation + attestation UID.
4. Show generated CID and open archived payload link.
5. Call `/api/claims/{eventId}/{wallet}` to show indexed artifact.

## Staging Recommendation

- Branch deploys to `staging.wifiproof.xyz`
- `main` deploys to `wifiproof.xyz`
- Keep separate env sets for staging vs production signer keys, World IDs, and Storacha credentials.
