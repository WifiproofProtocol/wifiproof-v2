# Two Supabase projects

WiFiProof deliberately uses two independent Supabase projects:

- `../supabase-events/` stores public event policy, derived evidence, rate limits, and relay jobs. It has no School Auth users or school records.
- `../supabase-school/` stores Supabase Auth users and the RLS-protected school pilot. It has no event evidence or relay jobs.

Run every Supabase CLI command with the matching directory as its working directory. Never run migrations from this parent directory and never reuse a service-role key between the two deployments.
