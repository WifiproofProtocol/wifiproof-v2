-- WiFiProof: events table
-- Used by /api/verify-ip to look up per-event venue hash, subnet, and time window.
-- event_id and venue_hash must be lowercase hex strings (0x-prefixed).

create table if not exists events (
  event_id     text        primary key,
  venue_hash   text        not null,
  subnet_prefix text       not null,
  start_time   bigint,
  end_time     bigint,
  venue_name   text,
  created_at   timestamptz default now()
);

-- Enforce lowercase hex format on insert/update
alter table events
  add constraint events_event_id_format
    check (event_id ~ '^0x[0-9a-f]+$'),
  add constraint events_venue_hash_format
    check (venue_hash ~ '^0x[0-9a-f]+$');

-- Only the service role can write; anon/authenticated can read nothing
alter table events enable row level security;

-- No public read — only the server-side admin client can query this table
-- (The admin client uses the service_role key which bypasses RLS)
