# @wifiproof/web

Next.js UI and server routes for WiFiProof V2.

## Product surfaces

- `/`: minimal Signal Field landing page
- `/events`: current event list
- `/event/[eventId]`: four-factor attendee check-in
- `/organizer`: organizer dashboard
- `/organizer/setup`: fee-enabled event creation and rotating venue QR
- `/school`: invite-only, RLS-protected School pilot
- `/education`: redirect to `/school`

## Trust boundaries

- Events data uses the server-only `EVENTS_SUPABASE_*` project.
- School Auth/data uses a different `NEXT_PUBLIC_SCHOOL_SUPABASE_*` project.
- World ID is required; Self and Coinbase are optional extra receipts.
- Lit signs a narrow attendance authorization. It never relays a transaction.
- CDP relays `claimAttendanceFor`. It never signs the attendance authorization.
- precise coordinates and raw IP addresses are not stored.

## Local development

```bash
cp packages/web/.env.example packages/web/.env.local
pnpm --filter web dev
```

Use `packages/web/supabase-events` and `packages/web/supabase-school` as separate Supabase CLI working directories. Production should link them to independent projects. For the fictional free-tier shared pilot, apply the tracked School migration through the existing project's SQL Editor; do not link both independent CLI migration directories to one remote history.

```bash
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

Production forbids the plaintext signer and legacy Naga path. The Chipotle path requires a pinned Action CID, one PKP, and an execute-only usage key scoped to one Lit Group.

See [`../../docs/SETUP.md`](../../docs/SETUP.md) for the complete numbered setup and [`../../docs/LIT_MIGRATION.md`](../../docs/LIT_MIGRATION.md) for signer migration and rotation.
