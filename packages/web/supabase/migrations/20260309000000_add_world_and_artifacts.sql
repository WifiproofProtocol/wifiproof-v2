-- Add missing event metadata columns used by API routes
alter table events
  add column if not exists venue_lat double precision,
  add column if not exists venue_lon double precision,
  add column if not exists radius_meters double precision;

-- World ID verifications (one human per event via nullifier hash)
create table if not exists world_verifications (
  id bigserial primary key,
  event_id text not null references events(event_id) on delete cascade,
  wallet text not null,
  nullifier_hash text not null,
  verification_level text,
  proof_json jsonb not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, nullifier_hash)
);

create index if not exists world_verifications_event_wallet_idx
  on world_verifications (event_id, wallet);

alter table world_verifications
  add constraint world_verifications_wallet_format
    check (wallet ~ '^0x[0-9a-f]{40}$'),
  add constraint world_verifications_nullifier_format
    check (nullifier_hash ~ '^0x[0-9a-f]+$');

alter table world_verifications enable row level security;

-- Claim artifacts archived to decentralized storage (Storacha/Filecoin)
create table if not exists attendance_artifacts (
  id bigserial primary key,
  event_id text not null references events(event_id) on delete cascade,
  wallet text not null,
  tx_hash text not null,
  attestation_uid text not null,
  proof_hash text,
  public_inputs_hash text,
  world_nullifier_hash text,
  cid text not null,
  network text not null default 'base-sepolia',
  created_at timestamptz not null default now()
);

create index if not exists attendance_artifacts_event_wallet_idx
  on attendance_artifacts (event_id, wallet, created_at desc);

alter table attendance_artifacts
  add constraint attendance_artifacts_wallet_format
    check (wallet ~ '^0x[0-9a-f]{40}$'),
  add constraint attendance_artifacts_tx_hash_format
    check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  add constraint attendance_artifacts_attestation_uid_format
    check (attestation_uid ~ '^0x[0-9a-f]{64}$'),
  add constraint attendance_artifacts_proof_hash_format
    check (proof_hash is null or proof_hash ~ '^0x[0-9a-f]{64}$'),
  add constraint attendance_artifacts_public_inputs_hash_format
    check (public_inputs_hash is null or public_inputs_hash ~ '^0x[0-9a-f]{64}$'),
  add constraint attendance_artifacts_world_nullifier_format
    check (world_nullifier_hash is null or world_nullifier_hash ~ '^0x[0-9a-f]+$');

alter table attendance_artifacts enable row level security;
