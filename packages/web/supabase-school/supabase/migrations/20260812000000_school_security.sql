-- School database only: multi-tenant, invite-only institutional attendance.
-- Apply after Supabase Auth is enabled and public sign-up is disabled.

do $$ begin
  create type school_role as enum ('student', 'lecturer', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type school_session_status as enum ('open', 'closed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists school_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references school_organizations(id) on delete cascade,
  institutional_id text not null,
  display_name text not null check (char_length(display_name) between 2 and 120),
  role school_role not null,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, institutional_id)
);

create table if not exists school_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references school_organizations(id) on delete cascade,
  code text not null,
  title text not null,
  room text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists school_unit_lecturers (
  unit_id uuid not null references school_units(id) on delete cascade,
  lecturer_user_id uuid not null references school_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (unit_id, lecturer_user_id)
);

create table if not exists school_enrollments (
  unit_id uuid not null references school_units(id) on delete cascade,
  student_user_id uuid not null references school_profiles(user_id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (unit_id, student_user_id)
);

create table if not exists school_networks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references school_organizations(id) on delete cascade,
  label text not null,
  cidrs cidr[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (cardinality(cidrs) <= 16),
  unique (organization_id, label)
);

create table if not exists school_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references school_organizations(id) on delete cascade,
  unit_id uuid not null references school_units(id) on delete cascade,
  lecturer_user_id uuid not null references school_profiles(user_id) on delete restrict,
  network_id uuid references school_networks(id) on delete set null,
  network_fingerprint text not null check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  network_label text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status school_session_status not null default 'open',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists school_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references school_organizations(id) on delete cascade,
  session_id uuid not null references school_sessions(id) on delete cascade,
  student_user_id uuid not null references school_profiles(user_id) on delete restrict,
  network_fingerprint text not null check (network_fingerprint ~ '^[0-9a-f]{64}$'),
  evidence_summary jsonb not null default '{}'::jsonb,
  status text not null default 'present' check (status in ('present', 'revoked')),
  recorded_at timestamptz not null default now(),
  unique (session_id, student_user_id)
);

create index if not exists school_profiles_org_role_idx on school_profiles (organization_id, role);
create index if not exists school_units_org_idx on school_units (organization_id, active);
create index if not exists school_sessions_unit_time_idx on school_sessions (unit_id, starts_at desc);
create index if not exists school_attendance_student_idx on school_attendance (student_user_id, recorded_at desc);

create or replace function school_current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from school_profiles
  where user_id = auth.uid() and active = true
  limit 1
$$;

create or replace function school_current_role()
returns school_role
language sql
stable
security definer
set search_path = public
as $$
  select role from school_profiles
  where user_id = auth.uid() and active = true
  limit 1
$$;

create or replace function school_is_admin(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from school_profiles
    where user_id = auth.uid()
      and organization_id = target_organization
      and role = 'admin'
      and active = true
  )
$$;

create or replace function school_teaches_unit(target_unit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from school_unit_lecturers
    where unit_id = target_unit and lecturer_user_id = auth.uid()
  )
$$;

create or replace function school_enrolled_in_unit(target_unit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from school_enrollments
    where unit_id = target_unit and student_user_id = auth.uid() and active = true
  )
$$;

create or replace function school_lecturer_can_view_student(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from school_enrollments e
    join school_unit_lecturers l on l.unit_id = e.unit_id
    join school_profiles p on p.user_id = e.student_user_id
    where l.lecturer_user_id = auth.uid()
      and e.student_user_id = target_user
      and e.active = true
      and p.organization_id = school_current_organization_id()
      and p.role = 'student'
      and p.active = true
  )
$$;

create or replace function school_profile_has_role(
  target_user uuid,
  target_organization uuid,
  target_role school_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from school_profiles
    where user_id = target_user
      and organization_id = target_organization
      and role = target_role
      and active = true
  )
$$;

revoke all on function school_current_organization_id() from public;
revoke all on function school_current_role() from public;
revoke all on function school_is_admin(uuid) from public;
revoke all on function school_teaches_unit(uuid) from public;
revoke all on function school_enrolled_in_unit(uuid) from public;
revoke all on function school_lecturer_can_view_student(uuid) from public;
revoke all on function school_profile_has_role(uuid, uuid, school_role) from public;
grant execute on function school_current_organization_id() to authenticated;
grant execute on function school_current_role() to authenticated;
grant execute on function school_is_admin(uuid) to authenticated;
grant execute on function school_teaches_unit(uuid) to authenticated;
grant execute on function school_enrolled_in_unit(uuid) to authenticated;
grant execute on function school_lecturer_can_view_student(uuid) to authenticated;
grant execute on function school_profile_has_role(uuid, uuid, school_role) to authenticated;

alter table school_organizations enable row level security;
alter table school_profiles enable row level security;
alter table school_units enable row level security;
alter table school_unit_lecturers enable row level security;
alter table school_enrollments enable row level security;
alter table school_networks enable row level security;
alter table school_sessions enable row level security;
alter table school_attendance enable row level security;

drop policy if exists school_organizations_member_select on school_organizations;
create policy school_organizations_member_select on school_organizations
  for select to authenticated
  using (id = school_current_organization_id());

drop policy if exists school_organizations_admin_update on school_organizations;
create policy school_organizations_admin_update on school_organizations
  for update to authenticated
  using (school_is_admin(id))
  with check (school_is_admin(id));

drop policy if exists school_profiles_scoped_select on school_profiles;
create policy school_profiles_scoped_select on school_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or school_is_admin(organization_id)
    or school_lecturer_can_view_student(user_id)
  );

drop policy if exists school_profiles_admin_write on school_profiles;
create policy school_profiles_admin_write on school_profiles
  for update to authenticated
  using (school_is_admin(organization_id))
  with check (school_is_admin(organization_id));

create or replace function school_complete_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update school_profiles
  set must_change_password = false, updated_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function school_complete_password_change() from public;
grant execute on function school_complete_password_change() to authenticated;

drop policy if exists school_units_member_select on school_units;
create policy school_units_member_select on school_units
  for select to authenticated
  using (
    organization_id = school_current_organization_id()
    and (
      school_is_admin(organization_id)
      or school_teaches_unit(id)
      or school_enrolled_in_unit(id)
    )
  );

drop policy if exists school_units_admin_write on school_units;
create policy school_units_admin_write on school_units
  for all to authenticated
  using (school_is_admin(organization_id))
  with check (school_is_admin(organization_id));

drop policy if exists school_unit_lecturers_member_select on school_unit_lecturers;
create policy school_unit_lecturers_member_select on school_unit_lecturers
  for select to authenticated
  using (
    lecturer_user_id = auth.uid()
    or exists (select 1 from school_units u where u.id = unit_id and school_is_admin(u.organization_id))
  );

drop policy if exists school_unit_lecturers_admin_write on school_unit_lecturers;
create policy school_unit_lecturers_admin_write on school_unit_lecturers
  for all to authenticated
  using (
    exists (
      select 1 from school_units u
      where u.id = unit_id
        and school_is_admin(u.organization_id)
    )
  )
  with check (
    exists (
      select 1 from school_units u
      where u.id = unit_id
        and school_is_admin(u.organization_id)
        and school_profile_has_role(lecturer_user_id, u.organization_id, 'lecturer')
    )
  );

drop policy if exists school_enrollments_scoped_select on school_enrollments;
create policy school_enrollments_scoped_select on school_enrollments
  for select to authenticated
  using (
    student_user_id = auth.uid()
    or school_teaches_unit(unit_id)
    or exists (select 1 from school_units u where u.id = unit_id and school_is_admin(u.organization_id))
  );

drop policy if exists school_enrollments_admin_write on school_enrollments;
create policy school_enrollments_admin_write on school_enrollments
  for all to authenticated
  using (
    exists (
      select 1 from school_units u
      where u.id = unit_id
        and school_is_admin(u.organization_id)
    )
  )
  with check (
    exists (
      select 1 from school_units u
      where u.id = unit_id
        and school_is_admin(u.organization_id)
        and school_profile_has_role(student_user_id, u.organization_id, 'student')
    )
  );

drop policy if exists school_networks_staff_select on school_networks;
create policy school_networks_staff_select on school_networks
  for select to authenticated
  using (
    organization_id = school_current_organization_id()
    and school_current_role() in ('lecturer', 'admin')
  );

drop policy if exists school_networks_admin_write on school_networks;
create policy school_networks_admin_write on school_networks
  for all to authenticated
  using (school_is_admin(organization_id))
  with check (school_is_admin(organization_id));

drop policy if exists school_sessions_scoped_select on school_sessions;
create policy school_sessions_scoped_select on school_sessions
  for select to authenticated
  using (
    organization_id = school_current_organization_id()
    and (school_is_admin(organization_id) or school_teaches_unit(unit_id) or school_enrolled_in_unit(unit_id))
  );

drop policy if exists school_sessions_lecturer_insert on school_sessions;
create policy school_sessions_lecturer_insert on school_sessions
  for insert to authenticated
  with check (
    organization_id = school_current_organization_id()
    and exists (
      select 1 from school_units u
      where u.id = unit_id and u.organization_id = organization_id
    )
    and (
      (lecturer_user_id = auth.uid() and school_teaches_unit(unit_id))
      or school_is_admin(organization_id)
    )
  );

drop policy if exists school_sessions_lecturer_update on school_sessions;
create policy school_sessions_lecturer_update on school_sessions
  for update to authenticated
  using (lecturer_user_id = auth.uid() or school_is_admin(organization_id))
  with check (lecturer_user_id = auth.uid() or school_is_admin(organization_id));

drop policy if exists school_sessions_admin_delete on school_sessions;
create policy school_sessions_admin_delete on school_sessions
  for delete to authenticated
  using (school_is_admin(organization_id));

drop policy if exists school_attendance_scoped_select on school_attendance;
create policy school_attendance_scoped_select on school_attendance
  for select to authenticated
  using (
    student_user_id = auth.uid()
    or school_is_admin(organization_id)
    or exists (
      select 1 from school_sessions s
      where s.id = session_id and school_teaches_unit(s.unit_id)
    )
  );

drop policy if exists school_attendance_student_insert on school_attendance;
drop policy if exists school_attendance_admin_write on school_attendance;
create policy school_attendance_admin_write on school_attendance
  for update to authenticated
  using (school_is_admin(organization_id))
  with check (school_is_admin(organization_id));

create or replace function school_record_attendance(
  target_session uuid,
  supplied_network_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  eligible_session school_sessions%rowtype;
begin
  if supplied_network_fingerprint !~ '^[0-9a-f]{64}$' then
    return 'denied';
  end if;

  select s.* into eligible_session
  from school_sessions s
  join school_enrollments e
    on e.unit_id = s.unit_id
   and e.student_user_id = auth.uid()
   and e.active = true
  join school_profiles p
    on p.user_id = auth.uid()
   and p.organization_id = s.organization_id
   and p.role = 'student'
   and p.active = true
  where s.id = target_session
    and s.status = 'open'
    and now() between s.starts_at and s.ends_at
    and s.network_fingerprint = supplied_network_fingerprint;

  if not found then
    return 'denied';
  end if;

  insert into school_attendance (
    organization_id,
    session_id,
    student_user_id,
    network_fingerprint,
    evidence_summary
  ) values (
    eligible_session.organization_id,
    eligible_session.id,
    auth.uid(),
    supplied_network_fingerprint,
    jsonb_build_object('network', 'matched', 'source', 'venue-egress', 'capturedAt', now())
  ) on conflict (session_id, student_user_id) do nothing;

  if found then return 'inserted'; end if;
  return 'duplicate';
end;
$$;

revoke all on function school_record_attendance(uuid, text) from public, anon;
grant execute on function school_record_attendance(uuid, text) to authenticated;

-- Authenticated clients may use these tables only through RLS.
grant select on school_organizations, school_profiles, school_units,
  school_unit_lecturers, school_enrollments, school_networks,
  school_sessions, school_attendance to authenticated;
grant insert, update, delete on school_units, school_unit_lecturers,
  school_enrollments, school_networks to authenticated;
grant update on school_organizations, school_profiles, school_attendance to authenticated;
grant insert, update, delete on school_sessions to authenticated;
