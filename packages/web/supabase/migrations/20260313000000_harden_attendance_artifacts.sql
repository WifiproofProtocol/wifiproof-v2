update attendance_artifacts
set world_nullifier_hash = null
where world_nullifier_hash is not null;

alter table attendance_artifacts
  drop constraint if exists attendance_artifacts_world_nullifier_format;

alter table attendance_artifacts
  drop column if exists world_nullifier_hash;

create unique index if not exists attendance_artifacts_tx_hash_idx
  on attendance_artifacts (tx_hash);
