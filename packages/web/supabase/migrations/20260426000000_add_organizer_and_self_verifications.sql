alter table events
  add column if not exists organizer text;

create index if not exists events_organizer_idx
  on events (organizer, start_time desc);

alter table events
  drop constraint if exists events_organizer_format;

alter table events
  add constraint events_organizer_format
    check (organizer is null or organizer ~ '^0x[0-9a-f]{40}$');

create table if not exists self_verifications (
  id bigserial primary key,
  event_id text not null references events(event_id) on delete cascade,
  wallet text not null,
  nullifier text not null,
  attestation_id integer not null,
  scope text not null,
  user_identifier text not null,
  user_defined_data text not null,
  proof_json jsonb not null,
  disclose_output jsonb,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, nullifier)
);

create index if not exists self_verifications_event_wallet_idx
  on self_verifications (event_id, wallet, created_at desc);

alter table self_verifications
  add constraint self_verifications_wallet_format
    check (wallet ~ '^0x[0-9a-f]{40}$'),
  add constraint self_verifications_nullifier_format
    check (nullifier ~ '^0x[0-9a-f]+$');

alter table self_verifications enable row level security;
