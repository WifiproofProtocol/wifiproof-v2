-- Events database: V2 evidence, rate limiting, and sponsored claim jobs.
alter table events
  add column if not exists venue_cidrs cidr[] not null default '{}',
  add column if not exists required_factor_bitmap integer not null default 15,
  add column if not exists policy_hash text;

alter table world_verifications
  add column if not exists event_action text,
  add column if not exists proof_hash text;
alter table world_verifications alter column proof_json drop not null;

alter table self_verifications
  add column if not exists proof_hash text;
alter table self_verifications alter column proof_json drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_factor_bitmap_range'
  ) then
    alter table events
      add constraint events_factor_bitmap_range
      check (required_factor_bitmap between 0 and 255);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_policy_hash_format'
  ) then
    alter table events
      add constraint events_policy_hash_format
      check (policy_hash is null or policy_hash ~ '^0x[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_venue_cidrs_limit'
  ) then
    alter table events
      add constraint events_venue_cidrs_limit
      check (cardinality(venue_cidrs) <= 16);
  end if;
end
$$;

create table if not exists event_challenge_audit (
  id bigserial primary key,
  event_id text not null references events(event_id) on delete cascade,
  slot bigint not null,
  challenge_hash text not null check (challenge_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (event_id, slot)
);

create index if not exists event_challenge_audit_expiry_idx on event_challenge_audit (expires_at);
alter table event_challenge_audit enable row level security;

create table if not exists attendance_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(event_id) on delete cascade,
  attendance_nullifier text not null,
  factor_bitmap integer not null,
  network_fingerprint text not null check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  challenge_hash text not null check (challenge_hash ~ '^[0-9a-f]{64}$'),
  proof_hash text,
  evidence_commitment text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (event_id, attendance_nullifier)
);

create index if not exists attendance_evidence_created_idx on attendance_evidence (created_at);
alter table attendance_evidence enable row level security;

create table if not exists claim_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_id text not null references events(event_id) on delete cascade,
  attendance_nullifier text not null,
  attendance_authorization jsonb not null,
  proof_hex text not null,
  public_inputs jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'submitting', 'confirmed', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  tx_hash text,
  attestation_uid text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, attendance_nullifier)
);

create index if not exists claim_jobs_pending_idx on claim_jobs (status, next_attempt_at);
alter table claim_jobs enable row level security;

create or replace function lease_claim_job(target_job_id uuid)
returns setof claim_jobs
language sql
security definer
set search_path = public
as $$
  update claim_jobs
  set status = 'submitting', attempts = attempts + 1, updated_at = now()
  where id = target_job_id
    and status in ('pending', 'failed')
    and next_attempt_at <= now()
    and attempts < 20
  returning *
$$;

revoke all on function lease_claim_job(uuid) from public, anon, authenticated;
grant execute on function lease_claim_job(uuid) to service_role;

create table if not exists api_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table api_rate_limits enable row level security;

create or replace function consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row api_rate_limits%rowtype;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into api_rate_limits (key_hash, request_count, window_started_at, updated_at)
  values (p_key_hash, 1, now(), now())
  on conflict (key_hash) do update
  set
    request_count = case
      when api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then 1
      else api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then now()
      else api_rate_limits.window_started_at
    end,
    updated_at = now()
  returning * into current_row;

  return query select
    current_row.request_count <= p_limit,
    greatest(0, p_limit - current_row.request_count),
    current_row.window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function consume_api_rate_limit(text, integer, integer) to service_role;

-- Retention is executed by a protected scheduled route or Supabase cron.
create or replace function prune_wifiproof_evidence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from event_challenge_audit where created_at < now() - interval '24 hours';
  delete from attendance_evidence where created_at < now() - interval '30 days';
  delete from claim_jobs where status in ('confirmed', 'failed') and updated_at < now() - interval '30 days';
  delete from api_rate_limits where updated_at < now() - interval '24 hours';
end;
$$;

revoke all on function prune_wifiproof_evidence() from public, anon, authenticated;
grant execute on function prune_wifiproof_evidence() to service_role;
