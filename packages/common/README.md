# @wifiproof/common

Shared TypeScript types, constants, and utilities for WiFiProof V2.

## Overview

This package contains code shared between `@wifiproof/web` and potentially other packages (CLI, SDK, etc.).

## Setup

```bash
# Initialize package (run from this directory)
pnpm init

# Install TypeScript
pnpm add -D typescript
```

## Structure

```
common/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Barrel export
│   ├── constants/
│   │   ├── addresses.ts   # Contract addresses (mainnet/testnet)
│   │   ├── schemas.ts     # EAS schema UIDs
│   │   └── gps.ts         # GPS scaling constants
│   │
│   ├── types/
│   │   ├── event.ts       # Event data structures
│   │   ├── circuit.ts     # Circuit input/output types
│   │   ├── attestation.ts # EAS attestation types
│   │   └── api.ts         # API request/response types
│   │
│   └── utils/
│       ├── gps.ts         # GPS coordinate utilities
│       └── validation.ts  # Input validation helpers
│
└── README.md
```

## Usage

From `@wifiproof/web`:

```typescript
import {
  COINBASE_KYC_SCHEMA,
  COINBASE_ATTESTER_MAINNET,
  scaleGPS,
  calculateThreshold
} from '@wifiproof/common';
```

## Venue Hash Helper

Use this helper to compute the on-chain `venueHash` exactly as the contract expects.

```ts
import { computeVenueHashFromScaled } from "@wifiproof/common";
import { keccak256 } from "ethereum-cryptography/keccak";

const venueHash = computeVenueHashFromScaled(
  37.7749,     // lat
  -122.4194,   // lon
  100,         // radius meters
  "0x1234...", // eventId (bytes32)
  (data) => "0x" + Buffer.from(keccak256(data)).toString("hex")
);
```

## Passkey Schema Design

This schema can be used to attest a passkey binding (optional, off-chain verification):

```
bytes32 credentialIdHash,address wallet,uint64 createdAt
```

## Key Constants

### Contract Addresses

```typescript
// Base Mainnet
export const EAS_ADDRESS = '0x4200000000000000000000000000000000000021';
export const COINBASE_ATTESTER_MAINNET = '0x357458739F90461b99789350868CD7CF330Dd7EE';
export const COINBASE_INDEXER_MAINNET = '0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C';

// Base Sepolia
export const COINBASE_ATTESTER_SEPOLIA = '0xB5644397a9733f86Cacd928478B29b4cD6041C45';
export const COINBASE_INDEXER_SEPOLIA = '0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B';
```

### EAS Schemas

```typescript
// Coinbase Verified Account (Mainnet)
export const COINBASE_KYC_SCHEMA = '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9';

// WiFiProof Attendance (register on deployment)
export const WIFIPROOF_SCHEMA = '0x...'; // TODO: Update after registration
```

### GPS Constants

```typescript
export const GPS_SCALE_FACTOR = 1_000_000;  // 10^6 for 6 decimal places
export const METERS_PER_DEGREE = 111_320;    // At equator
export const DEFAULT_RADIUS_METERS = 100;    // Default venue radius
```
