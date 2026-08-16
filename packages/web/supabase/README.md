# Supabase deployment modes

The production architecture uses two independent Supabase projects:

- `../supabase-events/` stores public event policy, derived evidence, rate limits, and relay jobs. It has no School Auth users or school records.
- `../supabase-school/` stores Supabase Auth users and the RLS-protected school pilot. It has no event evidence or relay jobs.

For the fictional free-tier pilot, both migration sets may be applied to the existing Events project. School remains logically isolated through `school_*` table and function names, Supabase Auth, and RLS. In this mode the School environment aliases intentionally point to the same project URL and keys as Events.

Run every Supabase CLI command with its matching directory as the working directory. Do not link both CLI directories to the same project because their migration histories are intentionally independent. In shared-pilot mode, apply the tracked School migration once through the existing project's SQL Editor. Move a real institution to its own project before storing authorized institutional data.
