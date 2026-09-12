# WiFiProof architecture audit

The screenshot’s 13 layers are a useful production checklist, but they should not become 13 services. WiFiProof is correctly shaped as a monorepo and modular Next.js application for V2. The important boundaries are data authority, signing authority, relay authority, proof verification, and deployment operations.

## Repository boundaries

```text
wifiproof-v2/
├── packages/web/                  UI, API routes, provider adapters, relay worker
│   ├── src/app/                   route surfaces only
│   ├── src/components/            shared landing and product UI
│   ├── src/lib/                   evidence, auth, provider, signer and relay modules
│   ├── lit-actions/               reviewed immutable authorization Action
│   ├── supabase-events/           Events database CLI project
│   └── supabase-school/           School database CLI project
├── packages/proof-app/            Noir circuit and browser prover
├── packages/contracts/            immutable Base protocol and Foundry tests
├── packages/common/               prototype-only shared code
├── docs/                          operations, security, assurance and setup
├── DESIGN.md                      visual system
├── PRODUCT.md                     product scope and claims
└── SECURITY.md                    threat model and disclosure
```

## 13-layer assessment

| Layer | Current implementation | Status | Next production action |
|---|---|---:|---|
| 1. Frontend foundations | Next.js 16, shared Signal Field header/tokens, landing, Organizer, Events, attendee and School surfaces | Good | Finish visual regression, reduced-motion, keyboard and mobile LCP testing |
| 2. APIs and backend logic | Route handlers with modules for CIDR, challenge, humanity, evidence, signing and relay | Good | Add contract-shaped API integration tests and typed error codes |
| 3. Database and storage | Independent Events and School Supabase projects and migration histories | Good | Apply clean migrations to two staging projects and enable backups |
| 4. Auth and permissions | World/Self/Coinbase event receipts; cookie SSR Supabase Auth and RLS for School | Good | Credentialed RLS tests and admin invite/disable runbook |
| 5. Hosting and deployment | Next/Vercel-compatible app and Foundry deployment script | Partial | Pin runtime versions, document preview/production promotion and rollback |
| 6. Cloud and compute | Managed Supabase, Lit signer, CDP smart account, Base RPC | Partial | Configure regional placement, quotas, budgets and provider outage modes |
| 7. CI/CD and version control | lint, Vitest, build, Foundry, Noir and gitleaks workflow | Good | Add database clean-migration and Playwright staging gates |
| 8. Security and RLS | threat model, exact CIDR, HMAC evidence, Safe ownership, School RLS | Good | External review, live RLS matrix, dependency review and incident drill |
| 9. Rate limiting | atomic Postgres rate limiter in Events DB | Good | Tune by pilot traffic and add route-specific limits and alerts |
| 10. Caching and CDN | Next static assets and hosting CDN; sensitive routes use `no-store` | Adequate | Set explicit cache headers and ensure no proof/evidence response is cached |
| 11. Load balancing and scaling | stateless web routes plus durable Supabase jobs; hosting platform load balances | Adequate | Load-test claim bursts, RPC/provider quotas and database connection limits |
| 12. Error tracking and logs | structured server logging is limited; client has actionable states | Weak | Add Sentry or equivalent with field redaction and alert ownership |
| 13. Availability and recovery | relay retry jobs and Safe pause exist | Partial | Supabase PITR/backups, RPC failover, runbooks, status page and recovery exercise |

## What should stay together

- Organizer, attendee, School, and public pages can remain in one Next application while the team is small.
- Provider adapters can remain in `src/lib`; they already share one `HumanityReceipt` boundary.
- The claim worker can remain a protected route backed by durable jobs until traffic proves a dedicated worker is necessary.
- Protocol contracts and the Noir circuit should remain separate packages because their toolchains and release gates are different.

## What must remain separate

- Events and School Supabase projects, secrets, migrations, backups, and retention policies.
- Lit authorization signing and CDP transaction relay.
- prototype contract addresses/configuration and V2 production configuration.
- public browser configuration and server secrets.
- raw provider proofs and the derived anonymous onchain receipt.

## Do not over-engineer yet

Do not add Kubernetes, a custom load balancer, Redis, Kafka, a hardware gateway, or microservices for the first public pilot. Add a new system only when a measured bottleneck or security boundary requires it. The next infrastructure investment should be error monitoring and recovery, not more services.

## Overall assessment

The codebase is structurally sound for a V2 pilot after the database split. It is not yet production-operational because external credentials, live policies, clean RLS tests, staging Playwright flows, monitoring, backups, and independent review still require real environments. Those are deployment gates, not reasons to rewrite the application architecture.
