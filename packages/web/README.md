# @wifiproof/web

Next.js 14 frontend for WiFiProof V2.

## Overview

This package contains the web application for:
1. **Event Creation** - Organizers create events with venue location
2. **Attendance Claiming** - Attendees generate ZK proofs and mint attestations
3. **Wallet Connection** - MetaMask, Coinbase Wallet integration

## Setup

```bash
# Initialize Next.js project (run from this directory)
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install additional dependencies
pnpm add viem wagmi @tanstack/react-query
pnpm add @noir-lang/noir_js @noir-lang/backend_barretenberg
pnpm add @supabase/supabase-js
pnpm add @fingerprintjs/fingerprintjs
pnpm add -D @playwright/test
```

## Structure (After Initialization)

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── create/            # Event creation flow
│   │   │   └── page.tsx
│   │   ├── claim/
│   │   │   └── [id]/          # Attendance claiming flow
│   │   │       └── page.tsx
│   │   └── api/               # API routes
│   │       └── events/
│   │           ├── create/
│   │           │   └── route.ts
│   │           ├── verify-ip/
│   │           │   └── route.ts
│   │           └── [id]/
│   │               └── route.ts
│   │
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── AttendanceProver.tsx
│   │   ├── EventCard.tsx
│   │   ├── QRCodeDisplay.tsx
│   │   └── WalletConnect.tsx
│   │
│   ├── lib/                  # Business logic
│   │   ├── supabase.ts      # Database client
│   │   ├── kyc.ts           # Coinbase KYC verification
│   │   ├── eas.ts           # EAS attestation helpers
│   │   └── wagmi.ts         # Wallet config
│   │
│   ├── utils/               # Pure utility functions
│   │   ├── gps.ts          # GPS scaling for circuits
│   │   ├── crypto.ts       # Signature helpers
│   │   └── formatting.ts   # Display formatters
│   │
│   ├── hooks/              # React hooks
│   │   ├── useProofGeneration.ts
│   │   ├── useWalletKYC.ts
│   │   └── useEvent.ts
│   │
│   └── types/              # TypeScript definitions
│       ├── event.ts
│       ├── circuit.ts
│       └── attestation.ts
│
├── public/
│   └── circuit.json        # Compiled Noir circuit (copy from circuits/target)
│
└── .env.example            # Environment template
```

## Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# Chain
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_WIFIPROOF_CONTRACT=0x...
NEXT_PUBLIC_EAS_CONTRACT=0x4200000000000000000000000000000000000021

# Server-only
ADMIN_PRIVATE_KEY=0x...
GPS_ENCRYPTION_KEY=xxx
```

## Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint

# E2E tests
pnpm playwright test
```
