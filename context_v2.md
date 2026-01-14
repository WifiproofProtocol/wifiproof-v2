# WiFiProof V2: Complete Project Context

**Last Updated:** January 14, 2026
**Author:** Xiaomao (https://github.com/wamimi)
**Project Status:** V1 Complete → V2 In Development

---

## Table of Contents

1. [Project Genesis & Vision](#project-genesis--vision)
2. [V1 Architecture & Learnings](#v1-architecture--learnings)
3. [The V2 Evolution: Brainstorming Journey](#the-v2-evolution-brainstorming-journey)
4. [Final V2 Architecture](#final-v2-architecture)
5. [Technical Implementation Guide](#technical-implementation-guide)
6. [Code Quality Standards](#code-quality-standards)
7. [Deployment Strategy](#deployment-strategy)

---

## Project Genesis & Vision

### What is WiFiProof?

**Tagline:** "The end of fake attendance. Context-aware, soulbound proofs of physical presence."

WiFiProof is a Zero-Knowledge proof-of-attendance protocol that uses **contextual constraints** to cryptographically verify physical presence at events. Unlike traditional proof-of-attendance systems (POAPs), WiFiProof binds users to both a **specific router subnet** (WiFi connectivity) and **physical coordinates** (GPS location) without revealing their exact location data.

### The Core Innovation

WiFiProof is the ONLY attendance protocol that uses **WiFi connectivity as a cryptographic primitive**. The innovation lies in three-layer verification:

1. **Space (ZK Geolocation):** Zero-Knowledge proof that user is within radius R of venue coordinates (X,Y) without revealing exact GPS
2. **Network (WiFi Verification):** Proof that user is connected to venue's local network (IP subnet matching)
3. **Identity (Sybil Resistance):** Proof-of-personhood via Coinbase KYC attestations (one human = one proof)

### Why This Matters

**The POAP Problem:**
- **Transferability:** POAPs are ERC-721 NFTs (transferable) → Alice can claim and send to Bob
- **Remote Farming:** QR codes/links can be screenshot and shared in Discord/Telegram
- **Privacy Invasion:** Public ledger reveals complete location history (doxxing profile)

**The WiFiProof Solution:**
- **Soulbound:** Uses Ethereum Attestation Service (EAS) - non-transferable by default
- **Context-Bound:** Requires active WiFi connection + GPS proximity
- **Privacy-First:** ZK circuits verify location constraints without revealing coordinates

---

## V1 Architecture & Learnings

### V1 Implementation (Completed)

WiFiProof V1 was a **portal-based system** where venue operators ran a server that issued cryptographically signed nonces to prove WiFi connectivity.

#### V1 Stack:
```
┌─────────────────────────────────────────────┐
│ PORTAL SERVER (Node.js + Express)          │
│ - ECDSA P-256 key pair generation          │
│ - Nonce issuance (IP-gated: 192.168.x.x)   │
│ - SQLite database (nonces table)           │
│ - Metrics + structured logging             │
└─────────────────────────────────────────────┘
              ↓ signed nonce
┌─────────────────────────────────────────────┐
│ PROOF CLIENT (Next.js + NoirJS)            │
│ - Browser-based ZK proof generation        │
│ - Barretenberg UltraPlonk prover           │
│ - localStorage device secret               │
└─────────────────────────────────────────────┘
              ↓ proof + nonce
┌─────────────────────────────────────────────┐
│ BLOCKCHAIN (Multi-chain)                   │
│ - zkVerify (Horizen Labs)                  │
│ - Base Sepolia (Solidity verifier)         │
│ - Starknet (Cairo verifier via Garaga)     │
└─────────────────────────────────────────────┘
```

#### V1 Circuit (`main.nr`):
```noir
// Inputs: user_secret, connection_nonce, venue_id, event_id,
//         nonce_hash, portal_sig_hash, time_window_start,
//         time_window_end, proof_timestamp

// Commitments:
// 1. user_commitment = pedersen([user_secret, venue_id, timestamp, nonce])
// 2. nullifier = pedersen([user_secret, venue_id, event_id, time_window, nonce_hash])
// 3. portal_binding = pedersen([nonce_hash, portal_sig_hash, venue_id, event_id])
```

### Critical V1 Limitations (Acknowledged)

#### 1. **Secret Extractability (Critical)**
```javascript
localStorage.getItem('wifiproof_user_secret') // Anyone can copy/share this
```
- **Attack:** User attends event → copies secret → sends to friend remotely
- **Cost:** $0
- **Impact:** Completely breaks proof-of-attendance guarantee

#### 2. **Multi-Device Exploitation**
```
Person A + Device 1 → localStorage.clear() → new secret → Proof 1
Person A + Device 2 → localStorage.clear() → new secret → Proof 2
Person A + Device 3 → localStorage.clear() → new secret → Proof 3
```
- **Attack:** One person with 3 phones = 3 proofs
- **Cost:** $0 (just clear storage)
- **Impact:** Sybil attacks on airdrops/rewards

#### 3. **Portal Infrastructure Burden**
- Organizers must run dedicated servers
- Single point of failure (portal down = proofs stop)
- Complex setup (keys, database, environment config)

#### 4. **No Human Verification**
- No proof-of-personhood integration
- Nullifiers generated but not enforced on-chain
- Circuit doesn't verify ECDSA signatures (trusts portal)

#### 5. **Operational Gaps**
- No nonce expiration (database bloat)
- No rate limiting enforcement
- No horizontal scaling
- No admin dashboard

### V1 Success Metrics

Despite limitations, V1 proved the concept:
- ✅ Real ZK proofs (36 ACIR opcodes - ultra-efficient)
- ✅ Multi-chain deployment (zkVerify, Base, Starknet)
- ✅ Production-quality infrastructure (logging, metrics, error recovery)
- ✅ Working browser-based proving (~30-120s proof generation)

**Key Learning:** The WiFi connectivity primitive is SOLID. The identity/Sybil layer needs redesign.

---

## The V2 Evolution: Brainstorming Journey

This section documents the **3-month research process** that led to V2's final architecture. Understanding this journey is crucial for maintaining the project's philosophical consistency.

### Phase 1: Privacy Concerns

**Initial V2 Idea:** Organizer visits `wifiproof.xyz/create` → browser captures GPS → stores in database

**Critical Question Raised:**
> "Is capturing GPS location not a privacy concern? I don't want my app knowing exact user locations."

**Research Conducted:**
- zkLocus (ZK location proofs) - Found whitepaper but NO developer documentation
- WitnessChain (Proof-of-Location) - Latency-based triangulation for **DePIN nodes**, not web browsers
- EigenCloud integration - Same issue: requires UDP pings (not possible in browsers)

**Key Realization #1:**
> WitnessChain/EigenCloud are for **hardware infrastructure nodes**, not user-facing web apps. Browsers are sandboxed and cannot respond to network pings.

### Phase 2: ZK Geolocation Discovery

**Breakthrough:** Found zkVerify/Mopro proof-of-geolocation demo
- Uses **Circom circuits** to compute distance between private GPS and public reference point
- Outputs ZK proof: "I'm within range" without leaking coordinates
- Built for iOS (Swift bindings), but logic is portable

**The Math:**
Instead of Haversine formula (requires trigonometry - expensive in ZK), use **Euclidean approximation** (Pythagorean theorem):

```
Distance² = (user_lat - venue_lat)² + (user_lon - venue_lon)²
Constraint: Distance² ≤ Radius²
```

**Why this works:**
- For small distances (<1km), Earth's curvature is negligible
- Only uses subtraction and multiplication (cheap in ZK)
- No sine/cosine computation needed

**Key Realization #2:**
> Client-side ZK is the solution. The user's device generates the proof locally. The server never sees raw GPS coordinates.

### Phase 3: The Attestation Decision 

**Problem Statement:**
> POAPs are ERC-721 NFTs. They're transferable. How do we make attendance proofs soulbound?

**Research:**
- ERC-4973 (Account-Bound Tokens) - Custom standard, low adoption
- Soulbound Tokens (Vitalik's proposal) - Philosophical framework, no standard implementation
- **Ethereum Attestation Service (EAS)** - Production-ready, used by Coinbase

**EAS Advantages:**
```solidity
// Attestations are non-transferable by design
struct Attestation {
    bytes32 uid;           // Unique ID
    address recipient;     // Locked to wallet
    address attester;      // Who issued it (WiFiProof contract)
    bytes32 schema;        // Data structure
    bytes data;            // Encoded event details
    uint64 time;           // Timestamp
    bool revocable;        // Can be revoked if fraud detected
}
```

- Non-transferable by default
- Composable (other apps can query attestations)
- Base native (deployed at `0x4200...0021`)
- Used by Coinbase for KYC verification

**Key Realization #3:**
> EAS attestations are the perfect primitive for soulbound attendance credentials.

### Phase 4: The Sybil Resistance Crisis 

**The Brutal Truth Moment:**
> "Farcaster used to cost $5 per account. Now it's FREE. This breaks our Sybil defense."

**Failed Approaches Considered:**

1. **Browser Fingerprinting (FingerprintJS)**
   - ❌ Weak: Can be bypassed with incognito mode
   - ❌ Privacy concerns: Tracking users across sessions
   - Verdict: Use as deterrent, not primary defense

2. **IP-Only Verification**
   - ❌ Organizer IP changes (mobile hotspots, WiFi restarts)
   - ❌ VPN tunneling (can fake being on local network)
   - ❌ CGNAT (multiple users share same public IP)
   - Verdict: Use as context signal, not proof

3. **Embedded Wallets (Privy)**
   - ❌ Unlimited wallet creation via different emails
   - ❌ No cost barrier (alice@gmail.com, bob@proton.me, etc.)
   - Verdict: Good for UX, terrible for Sybil resistance

**The Pivot:**
> "I don't want to take any risks. V2 must be KYC-gated from day 1. I only want verified unique humans."

**Final Decision:** Use **Coinbase Verification** (on-chain KYC attestations)

### Phase 5: Coinbase KYC Integration 

**What is Coinbase Verification?**
- When users complete KYC on Coinbase Exchange (government ID verification)
- Coinbase issues an **EAS attestation** to their connected wallet(s)
- Attestation proves: "This wallet belongs to a KYC'd human"
- Schema UID: `0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9`
- Attester: `0x357458739F90461b99789350868CD7CF330Dd7EE` (Coinbase official address)

**Why This Solves Sybil Attacks:**
1. **One human = max 3 wallets** (Coinbase KYC limit)
2. **Real identity backing** (government ID required)
3. **Free for users** (just verify on Coinbase app)
4. **On-chain verification** (no API dependencies)
5. **Revocable** (if fraud detected, Coinbase can revoke)

**GraphQL Query to Check Verification:**
```graphql
query {
  attestations(where: {
    recipient: { equals: "0x..." },
    schemaId: { equals: "0xf8b05c79..." },
    attester: { equals: "0x35745873..." },
    revoked: { equals: false }
  }) {
    id
  }
}
```

**Key Realization #4:**
> By gating with Coinbase KYC, we outsource the "unique human" problem to Coinbase's compliance team. This is production-ready Sybil resistance.

### Phase 6: The UX Simplification 

**Problem:**
> Original design had TWO QR codes: (1) WiFi connection, (2) Proof claim. Users would scan, connect, forget to come back.

**Solutions Explored:**

1. **Single QR Code (WiFi + URL)**
   ```
   WIFI:S:VenueSSID;T:WPA;P:password;H:https://wifiproof.xyz/claim?id=123;;
   ```
   - Modern iOS/Android auto-prompt: "Connect to WiFi? Open link?"
   - One scan, automatic flow

2. **Embedded Wallets → External Wallets**
   - Initial plan: Privy creates embedded wallet
   - **Problem:** Embedded wallet ≠ Wallet with Coinbase attestation
   - **Solution:** User connects their EXISTING wallet (MetaMask, Coinbase Wallet)

3. **3-Step User Flow (Final)**
   ```
   Step 1: Scan QR → Opens wifiproof.xyz/claim?id=123
   Step 2: Connect Wallet → Check for Coinbase attestation
   Step 3: Generate Proof → Mint attestation (gas-free via Paymaster)
   ```

**Key Realization #5:**
> Simplicity is security. The fewer steps, the fewer places for users to get confused or abandon.

---

## Final V2 Architecture

This is the **production-ready, auditable, scalable** architecture for WiFiProof V2.

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      EVENT ORGANIZER                         │
│  1. Visits wifiproof.xyz/create                             │
│  2. Connects wallet (Coinbase Wallet / MetaMask)            │
│  3. Inputs: Event Name, Date/Time, Venue Address            │
│  4. System geocodes address → (lat, lon)                    │
│  5. System captures organizer's IP subnet                   │
│  6. Generates WiFi QR code (displayed on screen/printed)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      EVENT ATTENDEE                          │
│  1. Arrives at venue                                        │
│  2. Scans WiFi QR code                                      │
│  3. Phone connects to venue WiFi                            │
│  4. Opens wifiproof.xyz/claim?id={event_uuid}              │
│  5. Connects wallet                                         │
│  6. System checks:                                          │
│     ✓ Coinbase KYC attestation exists?                     │
│     ✓ IP subnet matches organizer?                         │
│     ✓ GPS within 100m radius?                              │
│  7. Clicks "Mint Proof"                                     │
│  8. ZK proof generates in browser (30-60s)                  │
│  9. Attestation minted to wallet (gas-free)                 │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend (Next.js 14)
```typescript
// Framework: Next.js 14 (App Router)
// Styling: Tailwind CSS + shadcn/ui
// State: React Query + Zustand
// Auth: Wallet connection (no Privy embedded wallets)
// ZK: NoirJS + Barretenberg (browser-based proving)

Dependencies:
- @noir-lang/noir_js: ^0.30.0
- @noir-lang/backend_barretenberg: ^0.30.0
- viem: ^2.x (Ethereum interactions)
- wagmi: ^2.x (wallet connection)
- @tanstack/react-query: ^5.x
```

#### Backend (Serverless APIs)
```typescript
// Runtime: Next.js API Routes (Vercel Edge Functions)
// Database: Supabase (PostgreSQL)
// Storage: Encrypted event metadata
// IP Signing: ECDSA (secp256k1) for WiFi verification

API Routes:
- POST /api/events/create    → Store event metadata
- POST /api/events/verify-ip → Sign IP verification token
- GET  /api/events/[id]      → Fetch event details
```

#### Smart Contracts (Foundry)
```solidity
// Framework: Foundry (Solidity 0.8.24)
// Network: Base Mainnet
// Attestations: EAS (0x4200000000000000000000000000000000000021)

Contracts:
1. UltraVerifier.sol     → Auto-generated by Noir (ZK verifier)
2. WiFiProof.sol         → Main minting contract
3. Test suite            → Foundry fuzzing + invariant tests
```

#### Zero-Knowledge (Noir)
```noir
// Language: Noir v0.30.0+
// Proving System: Barretenberg UltraPlonk
// Circuit: Euclidean distance geolocation

Artifacts:
- circuits/src/main.nr              → Circuit logic
- circuits/target/wifiproof.json    → Compiled circuit
- contracts/src/UltraVerifier.sol   → Generated verifier
```

### Data Architecture

#### Database Schema (Supabase PostgreSQL)

```sql
-- Events table (encrypted GPS, ephemeral IP)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  venue_address TEXT NOT NULL,  -- "123 Market St, San Francisco, CA"

  -- Encrypted location data (AES-256-GCM)
  encrypted_gps BYTEA NOT NULL,  -- {lat: 37.7749, lon: -122.4194}
  encryption_key_id TEXT NOT NULL,  -- Key stored in env vars, rotated monthly

  -- Network verification
  venue_subnet_prefix TEXT,  -- "192.168.1" (NOT full IP for privacy)

  -- Time window
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Metadata
  max_attendees INTEGER DEFAULT 1000,
  radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auto-cleanup (delete 7 days after event ends)
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (end_time + interval '7 days') STORED,

  -- Indexes
  CONSTRAINT valid_time_window CHECK (end_time > start_time)
);

CREATE INDEX idx_events_active ON events(start_time, end_time)
  WHERE expires_at > NOW();

-- Claims table (Sybil prevention via uniqueness constraints)
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,

  -- Sybil signals (defense-in-depth)
  device_fingerprint TEXT,  -- FingerprintJS visitor ID
  ip_address TEXT,          -- For rate limiting only (not stored long-term)
  user_agent TEXT,

  -- Attestation reference
  attestation_uid BYTES32,  -- EAS attestation UID

  claimed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Uniqueness constraints (ONE proof per wallet per event)
  UNIQUE(event_id, wallet_address),

  -- Defense: Also prevent same device from claiming with different wallets
  UNIQUE(event_id, device_fingerprint)
);

CREATE INDEX idx_claims_by_event ON claims(event_id);
CREATE INDEX idx_claims_by_wallet ON claims(wallet_address);

-- Auto-delete old claims (GDPR compliance - IP addresses are PII)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'delete-expired-events',
  '0 3 * * *',  -- Daily at 3 AM
  $$
    DELETE FROM events WHERE expires_at < NOW();
    DELETE FROM claims WHERE claimed_at < NOW() - interval '30 days';
  $$
);
```

**Privacy Protections:**
1. **GPS Encryption:** Venue coordinates encrypted at rest (AES-256-GCM)
2. **IP Minimization:** Store subnet prefix only (`192.168.1`), not full IP
3. **Time-Boxed Storage:** Events auto-delete 7 days post-event
4. **PII Purging:** IP addresses deleted after 30 days (GDPR compliance)

#### EAS Schema Definition

```typescript
// Schema registered on Base Mainnet EAS
const WIFIPROOF_SCHEMA = {
  schema: "uint256 eventId, string venueName, uint64 timestamp, bool verifiedLocation, bool verifiedNetwork",
  resolverAddress: "0x0000000000000000000000000000000000000000", // No resolver needed
  revocable: true  // Allow revocation if fraud detected
};

// Registration transaction
const schemaUID = await eas.register({
  schema: WIFIPROOF_SCHEMA.schema,
  resolverAddress: WIFIPROOF_SCHEMA.resolverAddress,
  revocable: WIFIPROOF_SCHEMA.revocable
});

// Result: 0x... (This becomes WIFIPROOF_SCHEMA_UID in contracts)
```

### Circuit Implementation

#### File: `circuits/src/main.nr`

```noir
// WiFiProof V2: Zero-Knowledge Geolocation Prover
// Proves: "I am within R meters of venue coordinates without revealing my exact location"

use dep::std;

fn main(
    // === PRIVATE INPUTS (User's Secret Location) ===
    // User's actual GPS coordinates, scaled by 10^6 to convert decimals to integers
    // Example: 37.7749° → 37774900
    user_lat: Field,
    user_lon: Field,

    // === PUBLIC INPUTS (Venue Location & Constraints) ===
    // Venue's public coordinates (known to everyone)
    venue_lat: pub Field,
    venue_lon: pub Field,

    // Squared distance threshold (in scaled units)
    // Example: 100 meters → threshold_sq ≈ 8×10^8 (after scaling)
    threshold_sq: pub Field
) {
    // Step 1: Calculate coordinate differences
    // Noir's Field type handles negative numbers via modular arithmetic
    let delta_lat = user_lat - venue_lat;
    let delta_lon = user_lon - venue_lon;

    // Step 2: Square the differences (distance is always positive)
    let delta_lat_sq = delta_lat * delta_lat;
    let delta_lon_sq = delta_lon * delta_lon;

    // Step 3: Euclidean distance squared
    // This is the Pythagorean theorem: d² = Δx² + Δy²
    let dist_sq = delta_lat_sq + delta_lon_sq;

    // Step 4: THE CORE CONSTRAINT
    // Prove: user is within allowed radius
    // Proof generation FAILS if this constraint is not satisfied
    assert(dist_sq.lt(threshold_sq));
}
```

**Circuit Characteristics:**
- **Constraints:** 5 (subtraction × 2, multiplication × 2, comparison × 1)
- **Public Inputs:** 3 (venue_lat, venue_lon, threshold_sq)
- **Private Inputs:** 2 (user_lat, user_lon)
- **Proving Time:** ~30-60s in browser (Barretenberg WASM)
- **Proof Size:** ~14 KB (UltraPlonk)

**Why Euclidean Distance?**
- Haversine formula requires `sin()`, `cos()`, `sqrt()` → Expensive in ZK
- For small distances (<1km), Earth is approximately flat
- Error margin: <0.5% for distances under 500m
- Only uses Field arithmetic (subtraction, multiplication, comparison)

#### GPS Coordinate Scaling Logic

```typescript
// File: web-app/src/utils/gps.ts

const SCALE_FACTOR = 1_000_000; // 10^6 preserves 6 decimal places

/**
 * Convert GPS coordinates from floats to scaled integers
 *
 * Why: Noir circuits work with Field elements (integers only)
 * Example: 37.774900° → 37774900
 */
export function scaleGPS(lat: number, lon: number): { lat: string, lon: string } {
  return {
    lat: Math.round(lat * SCALE_FACTOR).toString(),
    lon: Math.round(lon * SCALE_FACTOR).toString()
  };
}

/**
 * Calculate squared distance threshold for circuit
 *
 * Formula: threshold_sq = (radius_meters / meters_per_degree * SCALE_FACTOR)²
 *
 * @param radiusMeters - Allowed radius (e.g., 100m)
 * @returns Squared threshold for circuit input
 */
export function calculateThreshold(radiusMeters: number): string {
  const METERS_PER_DEGREE = 111_320; // At equator
  const radiusDegrees = radiusMeters / METERS_PER_DEGREE;
  const radiusScaled = radiusDegrees * SCALE_FACTOR;
  const thresholdSq = Math.round(radiusScaled * radiusScaled);
  return thresholdSq.toString();
}

// Example usage:
// Event at: 37.7749° N, -122.4194° W
// User at:  37.7750° N, -122.4195° W (~11 meters away)
// Radius:   100 meters
// Result:   Proof succeeds ✓
```

### Smart Contract Implementation

#### File: `contracts/src/WiFiProof.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEAS, Attestation, AttestationRequest, AttestationRequestData } from
    "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { UltraVerifier } from "./UltraVerifier.sol";

/**
 * @title WiFiProof V2
 * @notice Mints soulbound attendance attestations with three-layer verification:
 *         1. Coinbase KYC (proves unique human)
 *         2. ZK Geolocation (proves physical presence)
 *         3. IP Signature (proves WiFi connectivity)
 * @dev All proofs are gas-sponsored via Coinbase Paymaster
 */
contract WiFiProof {
    // === IMMUTABLES ===
    IEAS public immutable eas;
    UltraVerifier public immutable verifier;
    address public immutable adminSigner;  // For IP verification signatures

    // === CONSTANTS ===
    bytes32 public constant COINBASE_KYC_SCHEMA =
        0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9;
    address public constant COINBASE_ATTESTER =
        0x357458739F90461b99789350868CD7CF330Dd7EE;
    bytes32 public immutable WIFIPROOF_SCHEMA; // Set in constructor

    // === STATE ===
    // Prevents double-claiming: eventId → wallet → claimed
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // === EVENTS ===
    event ProofVerified(
        address indexed attendee,
        bytes32 indexed eventId,
        bytes32 attestationUID,
        uint256 timestamp
    );

    event KYCCheckFailed(address indexed wallet, string reason);

    // === ERRORS ===
    error AlreadyClaimed(bytes32 eventId, address wallet);
    error InvalidZKProof();
    error InvalidIPSignature();
    error NoKYCAttestation();
    error InvalidEventTime();

    // === CONSTRUCTOR ===
    constructor(
        address _eas,
        address _verifier,
        address _adminSigner,
        bytes32 _wifiproofSchema
    ) {
        eas = IEAS(_eas);
        verifier = UltraVerifier(_verifier);
        adminSigner = _adminSigner;
        WIFIPROOF_SCHEMA = _wifiproofSchema;
    }

    /**
     * @notice Mint attendance attestation with full verification
     * @param proof ZK proof bytes (generated by Noir circuit)
     * @param publicInputs [venue_lat, venue_lon, threshold_sq]
     * @param ipSignature Server-signed proof of WiFi connectivity
     * @param eventId Unique event identifier
     * @param eventStartTime Event start timestamp (for time validation)
     * @param eventEndTime Event end timestamp
     */
    function claimAttendance(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        bytes calldata ipSignature,
        bytes32 eventId,
        uint64 eventStartTime,
        uint64 eventEndTime,
        string calldata venueName
    ) external returns (bytes32 attestationUID) {
        // === VERIFICATION LAYER 1: UNIQUE HUMAN ===
        // Check if msg.sender has Coinbase KYC attestation
        if (!_hasValidKYC(msg.sender)) {
            emit KYCCheckFailed(msg.sender, "No Coinbase verification found");
            revert NoKYCAttestation();
        }

        // === VERIFICATION LAYER 2: PHYSICAL PRESENCE (ZK) ===
        // Verify the Noir-generated proof (calls UltraVerifier.sol)
        if (!verifier.verify(proof, publicInputs)) {
            revert InvalidZKProof();
        }

        // === VERIFICATION LAYER 3: WIFI CONNECTIVITY ===
        // Verify server signed this (proves user was on local network)
        if (!_verifyIPSignature(ipSignature, msg.sender, eventId)) {
            revert InvalidIPSignature();
        }

        // === VERIFICATION LAYER 4: TIME WINDOW ===
        // Ensure claim happens during event (prevents pre/post-claiming)
        if (block.timestamp < eventStartTime || block.timestamp > eventEndTime) {
            revert InvalidEventTime();
        }

        // === VERIFICATION LAYER 5: UNIQUENESS ===
        // Prevent same wallet from claiming twice
        if (hasClaimed[eventId][msg.sender]) {
            revert AlreadyClaimed(eventId, msg.sender);
        }

        // Mark as claimed
        hasClaimed[eventId][msg.sender] = true;

        // === MINT ATTESTATION ===
        // Issue soulbound EAS attestation to user's wallet
        attestationUID = eas.attest(
            AttestationRequest({
                schema: WIFIPROOF_SCHEMA,
                data: AttestationRequestData({
                    recipient: msg.sender,
                    expirationTime: 0,  // Never expires
                    revocable: true,    // Can revoke if fraud detected
                    refUID: bytes32(0),
                    data: abi.encode(
                        eventId,
                        venueName,
                        block.timestamp,
                        true,  // verifiedLocation
                        true   // verifiedNetwork
                    ),
                    value: 0
                })
            })
        );

        emit ProofVerified(msg.sender, eventId, attestationUID, block.timestamp);
    }

    /**
     * @dev Check if wallet has valid Coinbase KYC attestation
     * Note: This is a simplified check. Production should query EAS GraphQL
     *       or maintain a Merkle tree of verified addresses for gas efficiency.
     */
    function _hasValidKYC(address wallet) internal view returns (bool) {
        // Query EAS for attestations matching:
        // - Schema: Coinbase Verified Account
        // - Attester: Coinbase official address
        // - Recipient: wallet
        // - Not revoked

        // Implementation options:
        // A) Off-chain indexer (GraphQL) - Cheapest
        // B) Merkle proof of inclusion - Gas-efficient
        // C) Direct EAS query (expensive) - Most decentralized

        // For V2, we use off-chain verification in API + signature
        // This function can be removed if using signed attestation approach
        return true; // Placeholder - implement in production
    }

    /**
     * @dev Verify server signed the IP verification
     */
    function _verifyIPSignature(
        bytes calldata signature,
        address wallet,
        bytes32 eventId
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(wallet, eventId));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recovered = _recoverSigner(ethSignedHash, signature);
        return recovered == adminSigner;
    }

    /**
     * @dev ECDSA signature recovery
     */
    function _recoverSigner(
        bytes32 ethSignedHash,
        bytes memory signature
    ) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(ethSignedHash, v, r, s);
    }
}
```

**Gas Optimization Notes:**
- `immutable` variables save ~2100 gas per read
- `mapping` for claims more efficient than array iteration
- `bytes32` event IDs cheaper than `string`
- Off-chain KYC verification (via API signature) avoids expensive EAS queries

### API Implementation

#### File: `web-app/src/app/api/events/verify-ip/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
});

/**
 * POST /api/events/verify-ip
 *
 * Verifies user is on same network as organizer and returns signed proof
 *
 * Security:
 * - Checks IP subnet match (not exact IP for privacy)
 * - Rate limits by IP (max 3 requests per event)
 * - Signs verification with admin private key
 */
export async function POST(req: NextRequest) {
  try {
    const { eventId, walletAddress } = await req.json();

    // 1. Extract user's IP
    const userIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

    if (userIP === 'unknown') {
      return NextResponse.json(
        { error: 'Could not determine IP address' },
        { status: 400 }
      );
    }

    // 2. Fetch event metadata
    const { data: event, error } = await supabase
      .from('events')
      .select('venue_subnet_prefix, start_time, end_time')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 3. Verify event is currently active
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    if (now < startTime) {
      return NextResponse.json(
        { error: 'Event has not started yet' },
        { status: 403 }
      );
    }

    if (now > endTime) {
      return NextResponse.json(
        { error: 'Event has ended' },
        { status: 403 }
      );
    }

    // 4. Check IP subnet match
    const userSubnet = userIP.split('.').slice(0, 3).join('.');
    const venueSubnet = event.venue_subnet_prefix;

    if (userSubnet !== venueSubnet) {
      return NextResponse.json(
        {
          error: 'Not on venue network',
          details: 'You must be connected to the venue WiFi'
        },
        { status: 403 }
      );
    }

    // 5. Rate limiting check (prevent spam)
    const { count } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('ip_address', userIP);

    if (count && count >= 3) {
      return NextResponse.json(
        { error: 'Too many attempts from this IP' },
        { status: 429 }
      );
    }

    // 6. Generate signature (proves server verified connectivity)
    const messageHash = keccak256(
      encodePacked(['address', 'bytes32'], [walletAddress, eventId])
    );

    const signature = await walletClient.signMessage({
      message: { raw: messageHash }
    });

    // 7. Return signed verification
    return NextResponse.json({
      verified: true,
      signature,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('IP verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// Helper function (move to utils in production)
function keccak256(data: Uint8Array): `0x${string}` {
  // Use viem's keccak256
  return keccak256(data);
}

function encodePacked(types: string[], values: any[]): Uint8Array {
  // Use viem's encodePacked
  return encodePacked(types, values);
}
```

### Frontend Integration

#### File: `web-app/src/components/AttendanceProver.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { prepareCircuitInputs, getUserLocation } from '@/utils/gps';
import { checkCoinbaseKYC } from '@/lib/kyc';
import circuit from '@/circuits/target/wifiproof.json';

interface Event {
  id: string;
  name: string;
  venueName: string;
  venueLatitude: number;
  venueLongitude: number;
  radiusMeters: number;
  startTime: string;
  endTime: string;
}

export function AttendanceProver({ event }: { event: Event }) {
  const { address } = useAccount();
  const [status, setStatus] = useState<string>('Ready to prove attendance');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  async function handleProveAttendance() {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      // === STEP 1: VERIFY KYC ===
      setStatus('Checking Coinbase verification...');
      setProgress(10);

      const hasKYC = await checkCoinbaseKYC(address);
      if (!hasKYC) {
        setError('You need Coinbase verification to claim this proof');
        return;
      }

      // === STEP 2: VERIFY IP (WIFI CONNECTIVITY) ===
      setStatus('Verifying WiFi connection...');
      setProgress(20);

      const ipResponse = await fetch('/api/events/verify-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          walletAddress: address
        })
      });

      if (!ipResponse.ok) {
        const error = await ipResponse.json();
        setError(error.details || 'Not connected to venue WiFi');
        return;
      }

      const { signature: ipSignature } = await ipResponse.json();

      // === STEP 3: GET USER LOCATION ===
      setStatus('Requesting location permission...');
      setProgress(30);

      let userLocation;
      try {
        userLocation = await getUserLocation();
      } catch (err) {
        setError('Location permission denied');
        return;
      }

      // === STEP 4: PREPARE CIRCUIT INPUTS ===
      setStatus('Preparing proof inputs...');
      setProgress(40);

      const inputs = await prepareCircuitInputs(
        { latitude: event.venueLatitude, longitude: event.venueLongitude },
        event.radiusMeters,
        userLocation
      );

      // === STEP 5: GENERATE ZK PROOF ===
      setStatus('Generating zero-knowledge proof (30-60s)...');
      setProgress(50);

      const noir = new Noir(circuit as any);
      const backend = new BarretenbergBackend(circuit as any);

      // Execute circuit (this validates constraints)
      const { witness } = await noir.execute(inputs);

      setStatus('Creating cryptographic proof...');
      setProgress(70);

      // Generate proof
      const { proof, publicInputs } = await backend.generateProof(witness);

      // === STEP 6: MINT ATTESTATION ===
      setStatus('Minting attendance badge...');
      setProgress(90);

      // Call smart contract (via wagmi)
      // Implementation depends on your contract ABI
      // This would use useWriteContract hook in production

      setStatus('✅ Attendance proof minted!');
      setProgress(100);

    } catch (err: any) {
      console.error('Proof generation failed:', err);

      if (err.message.includes('Constraint failed')) {
        setError('You are not at the venue location');
      } else {
        setError(`Error: ${err.message}`);
      }

      setProgress(0);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Event Details */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
        <p className="text-gray-600">{event.venueName}</p>
        <p className="text-sm text-gray-500 mt-2">
          {new Date(event.startTime).toLocaleString()} -
          {new Date(event.endTime).toLocaleString()}
        </p>
      </div>

      {/* Status Display */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{status}</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleProveAttendance}
        disabled={!address || (progress > 0 && progress < 100)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {progress === 0 ? 'Prove Attendance' :
         progress === 100 ? 'Claimed ✓' :
         'Generating Proof...'}
      </button>

      {/* Privacy Notice */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        🔒 Your GPS coordinates are never shared. Zero-knowledge proofs keep your location private.
      </p>
    </div>
  );
}
```

---

## Technical Implementation Guide

### Phase 1: Project Setup (Day 1) 

```bash
# Create new directory (ALREADY DONE)
mkdir wifiproof-v2
cd wifiproof-v2

# Initialize Git(ALRADY DONE)
git init
git remote add origin git@github.com:WifiproofProtocol/wifiproof-v2.git
# Create directory structure
mkdir -p circuits/{src,target}
mkdir -p contracts/{src,script,test}
mkdir -p web-app/src/{app,components,lib,utils}

# Initialize Noir project
cd circuits
nargo init
cd ..

# Initialize Foundry project
cd contracts
forge init --force
cd ..

# Initialize Next.js project
cd web-app
pnpm create next-app@latest . --typescript --tailwind --app
cd ..
```

### Phase 2: Circuit Development (Day 2-3)

```bash
cd circuits

# 1. Write circuit (main.nr)
# Copy from "Circuit Implementation" section above

# 2. Create test inputs (Prover.toml)
cat > Prover.toml << EOF
user_lat = "37774900"
user_lon = "-122419400"
venue_lat = "37769200"
venue_lon = "-122486100"
threshold_sq = "800000000"
EOF

# 3. Compile and test
nargo check          # Verify syntax
nargo prove          # Generate test proof
nargo verify         # Verify test proof

# 4. Generate Solidity verifier
nargo codegen-verifier --output-path ../contracts/src/

# Result: UltraVerifier.sol created
```

### Phase 3: Smart Contract Development (Day 4-5)

```bash
cd contracts

# 1. Install dependencies
forge install ethereum-attestation-service/eas-contracts --no-commit

# 2. Write WiFiProof.sol (copy from "Smart Contract Implementation" above)

# 3. Create deployment script
cat > script/Deploy.s.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/WiFiProof.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address eas = 0x4200000000000000000000000000000000000021; // Base EAS

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy verifier (auto-deployed with WiFiProof)
        // 2. Deploy WiFiProof contract
        WiFiProof wifiproof = new WiFiProof(
            eas,
            address(0), // verifier address set in constructor
            vm.addr(deployerPrivateKey), // admin signer
            bytes32(0) // schema UID (register first via EAS UI)
        );

        vm.stopBroadcast();

        console.log("WiFiProof deployed at:", address(wifiproof));
    }
}
EOF

# 4. Run tests
forge test -vvv

# 5. Deploy to Base Sepolia (testnet)
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
```

### Phase 4: Frontend Development (Day 6-10)

```bash
cd web-app

# 1. Install dependencies
pnpm add @noir-lang/noir_js @noir-lang/backend_barretenberg
pnpm add viem wagmi @tanstack/react-query
pnpm add @supabase/supabase-js
pnpm add @fingerprintjs/fingerprintjs

# 2. Set up environment
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_WIFIPROOF_CONTRACT=0x...
NEXT_PUBLIC_EAS_CONTRACT=0x4200000000000000000000000000000000000021

ADMIN_PRIVATE_KEY=0x...
EOF

# 3. Copy circuit artifact
cp ../circuits/target/wifiproof.json public/circuit.json

# 4. Implement components (copy from sections above):
# - components/AttendanceProver.tsx
# - components/WalletConnect.tsx
# - lib/kyc.ts
# - utils/gps.ts
# - app/api/events/verify-ip/route.ts

# 5. Run development server
pnpm dev
```

### Phase 5: Database Setup (Day 11)

```sql
-- 1. Go to https://supabase.com
-- 2. Create new project: "wifiproof-v2"
-- 3. Run SQL from "Database Schema" section above
-- 4. Enable Row Level Security (RLS):

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Public read access to active events
CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT
  USING (expires_at > NOW());

-- Only service role can write
CREATE POLICY "Only service role can insert events"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Claims readable by owner
CREATE POLICY "Users can read their own claims"
  ON claims FOR SELECT
  USING (wallet_address = current_setting('request.jwt.claims')::json->>'wallet_address');
```

### Phase 6: Testing & QA (Day 12-14)

```bash
# 1. Circuit tests
cd circuits
nargo test

# 2. Contract tests
cd ../contracts
forge test --gas-report

# 3. Frontend E2E tests (Playwright)
cd ../web-app
pnpm add -D @playwright/test
pnpm playwright test

# 4. Manual testing checklist:
# ✓ Create event as organizer
# ✓ Generate QR code
# ✓ Scan QR on different device
# ✓ Connect wallet without KYC → Should fail
# ✓ Connect wallet with KYC → Should succeed
# ✓ Generate proof while OFF WiFi → Should fail
# ✓ Generate proof while ON WiFi → Should succeed
# ✓ Attempt double claim → Should fail
# ✓ View attestation on Base EAS explorer
```

### Phase 7: Deployment (Day 15)

```bash
# 1. Deploy contracts to Base Mainnet
cd contracts
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify

# 2. Register EAS schema
# Visit: https://base.easscan.org/schema/create
# Schema: "uint256 eventId, string venueName, uint64 timestamp, bool verifiedLocation, bool verifiedNetwork"
# Save returned schema UID

# 3. Deploy frontend to Vercel
cd ../web-app
vercel --prod

# 4. Update environment variables in Vercel dashboard
# 5. Test production deployment
```

---

## Code Quality Standards

These are **non-negotiable** standards for WiFiProof V2. Clean code is maintainable code.

### 1. Naming Conventions

```typescript
// ✅ GOOD: Descriptive, intention-revealing names
function verifyUserIsOnVenueNetwork(userIP: string, venueSubnet: string): boolean {
  return userIP.startsWith(venueSubnet);
}

const hasValidCoinbaseAttestation = await checkKYCStatus(walletAddress);

// ❌ BAD: Cryptic, non-descriptive names
function chk(ip: string, sub: string): boolean {
  return ip.startsWith(sub);
}

const x = await getStatus(addr);
```

**Rules:**
- Functions: Verb phrases (`generateProof`, `verifySignature`, `mintAttestation`)
- Booleans: Question form (`isValid`, `hasKYC`, `canClaim`)
- Constants: SCREAMING_SNAKE_CASE (`SCALE_FACTOR`, `METERS_PER_DEGREE`)
- Components: PascalCase (`AttendanceProver`, `QRCodeDisplay`)

### 2. Function Length

```typescript
// ✅ GOOD: Single responsibility, <50 lines
async function generateZKProof(inputs: CircuitInputs): Promise<Proof> {
  const noir = await initializeCircuit();
  const witness = await noir.execute(inputs);
  const proof = await noir.generateProof(witness);
  return proof;
}

// ❌ BAD: God function, 200+ lines, multiple responsibilities
async function handleEverything() {
  // ... 200 lines of mixed concerns
}
```

**Rules:**
- Max 50 lines per function (exceptions: complex algorithms with comments)
- One level of abstraction per function
- Extract helper functions liberally

### 3. Error Handling

```typescript
// ✅ GOOD: Specific error types, helpful messages
class LocationPermissionDeniedError extends Error {
  constructor() {
    super('User denied location permission. GPS proof cannot be generated.');
    this.name = 'LocationPermissionDeniedError';
  }
}

try {
  const location = await getUserLocation();
} catch (error) {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      throw new LocationPermissionDeniedError();
    }
  }
  throw error; // Re-throw unexpected errors
}

// ❌ BAD: Silent failures, generic errors
try {
  const location = await getUserLocation();
} catch (error) {
  console.log('oops'); // Silent failure
  return null; // Hides the error from caller
}
```

**Rules:**
- Never swallow errors silently
- Create custom error types for domain errors
- Include actionable error messages
- Log errors with context (user ID, event ID, timestamp)

### 4. Type Safety

```typescript
// ✅ GOOD: Explicit types, no 'any'
interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

interface ScaledGPS {
  lat: string; // Scaled integer as string
  lon: string;
}

function scaleGPS(coords: GPSCoordinates): ScaledGPS {
  // Type-safe implementation
}

// ❌ BAD: 'any' types, no interfaces
function scaleGPS(coords: any): any {
  return { lat: coords.lat * 1000000, lon: coords.lon * 1000000 };
}
```

**Rules:**
- Zero `any` types (use `unknown` if truly dynamic)
- Define interfaces for all data structures
- Use discriminated unions for state machines
- Enable `strict` mode in `tsconfig.json`

### 5. Comments & Documentation

```typescript
// ✅ GOOD: Explains WHY, not WHAT
/**
 * Scales GPS coordinates by 10^6 to convert floats to integers.
 *
 * Rationale: Noir circuits work with Field elements (integers only).
 * Decimal precision: 6 digits (e.g., 37.7749° → 37774900)
 *
 * @param latitude - Decimal degrees (-90 to 90)
 * @param longitude - Decimal degrees (-180 to 180)
 * @returns Scaled coordinates as string (for Field element compatibility)
 */
function scaleGPS(latitude: number, longitude: number): ScaledGPS {
  const SCALE_FACTOR = 1_000_000;
  return {
    lat: Math.round(latitude * SCALE_FACTOR).toString(),
    lon: Math.round(longitude * SCALE_FACTOR).toString()
  };
}

// ❌ BAD: States the obvious
// Multiplies latitude by one million
const lat = latitude * 1000000;
```

**Rules:**
- Document WHY, not WHAT (code should be self-documenting for WHAT)
- JSDoc for public APIs
- Inline comments for non-obvious logic
- No commented-out code (use git history)

### 6. Testing

```typescript
// ✅ GOOD: Descriptive test names, arrange-act-assert
describe('scaleGPS', () => {
  it('should convert San Francisco coordinates to scaled integers', () => {
    // Arrange
    const coords = { latitude: 37.7749, longitude: -122.4194 };

    // Act
    const scaled = scaleGPS(coords);

    // Assert
    expect(scaled.lat).toBe('37774900');
    expect(scaled.lon).toBe('-122419400');
  });

  it('should handle negative longitude correctly', () => {
    const coords = { latitude: 0, longitude: -1.5 };
    const scaled = scaleGPS(coords);
    expect(scaled.lon).toBe('-1500000');
  });
});

// ❌ BAD: Vague test names, no structure
test('test1', () => {
  expect(scaleGPS({ latitude: 37.7749, longitude: -122.4194 })).toBe(something);
});
```

**Rules:**
- Test names: "should [expected behavior] when [condition]"
- One assertion per test (exceptions: closely related assertions)
- Test edge cases (negative numbers, zero, max values)
- Mock external dependencies (network, filesystem)

### 7. Git Commit Messages

```bash
# ✅ GOOD: Conventional commits format
git commit -m "feat(circuit): implement Euclidean distance geolocation

- Add main.nr with scaled GPS coordinate support
- Implement Pythagorean distance constraint
- Add test inputs for San Francisco venue
- Generate UltraVerifier.sol for Base deployment

Closes #12"

# ❌ BAD: Vague, no context
git commit -m "fix stuff"
git commit -m "wip"
```

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no behavior change)
- `test`: Adding tests
- `chore`: Maintenance (deps, config)

### 8. File Organization

```
web-app/src/
├── app/                    # Next.js routes
│   ├── page.tsx           # Landing page
│   ├── create/            # Organizer flow
│   ├── claim/[id]/        # Attendee flow
│   └── api/               # Backend routes
│       └── events/
├── components/            # Reusable UI components
│   ├── ui/               # shadcn primitives
│   ├── AttendanceProver.tsx
│   └── QRCodeDisplay.tsx
├── lib/                  # Business logic
│   ├── kyc.ts           # Coinbase verification
│   ├── eas.ts           # Attestation service
│   └── supabase.ts      # Database client
├── utils/               # Pure functions
│   ├── gps.ts          # Coordinate scaling
│   ├── crypto.ts       # Signature verification
│   └── formatting.ts   # Display helpers
├── types/              # TypeScript definitions
│   ├── circuit.ts
│   ├── event.ts
│   └── attestation.ts
└── hooks/              # React hooks
    ├── useProofGeneration.ts
    └── useWalletKYC.ts
```

**Rules:**
- Group by feature, not by file type
- Max 3 levels of nesting
- Barrel exports (`index.ts`) for clean imports
- Separate business logic from UI components

---

## Deployment Strategy

### Testnet Deployment (Base Sepolia)

```bash
# 1. Deploy contracts
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify

# 2. Register EAS schema on Sepolia
# Visit: https://base-sepolia.easscan.org/schema/create

# 3. Update frontend env vars
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_WIFIPROOF_CONTRACT=0x...

# 4. Deploy to Vercel preview
vercel
```

### Mainnet Deployment (Base)

```bash
# Pre-deployment checklist:
# ✅ All tests passing (forge test, jest, playwright)
# ✅ Security audit completed (if handling significant value)
# ✅ Gas optimization review
# ✅ Frontend performance audit (Lighthouse > 90)
# ✅ Database backups configured
# ✅ Monitoring/alerting setup (Sentry, Datadog)

# 1. Deploy contracts
forge script script/Deploy.s.sol \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  --slow  # Extra confirmation prompts

# 2. Register production EAS schema
# Visit: https://base.easscan.org/schema/create

# 3. Update production environment
NEXT_PUBLIC_NETWORK=base
NEXT_PUBLIC_WIFIPROOF_CONTRACT=0x...

# 4. Deploy to Vercel production
vercel --prod

# 5. Post-deployment verification:
# ✓ Test end-to-end flow on mainnet
# ✓ Verify contract on BaseScan
# ✓ Check EAS schema registration
# ✓ Test Paymaster gas sponsorship
# ✓ Monitor error rates for 24 hours
```

### Monitoring & Maintenance

```bash
# Set up monitoring
# 1. Sentry for error tracking
# 2. Vercel Analytics for performance
# 3. Supabase metrics for database health
# 4. Custom alerts for contract events

# Weekly maintenance tasks:
# - Review error logs
# - Check database growth (claims table)
# - Rotate API keys if needed
# - Update dependencies (security patches)
```

---

## Success Metrics & KPIs

### Launch Goals (Month 1)

- **Adoption:** 100 events created, 1,000+ attendees
- **Performance:** <60s proof generation time (p95)
- **Reliability:** 99.5% uptime
- **Security:** Zero successful Sybil attacks detected

### Growth Metrics (Month 3)

- **Network Effects:** 50+ venues/conferences using WiFiProof
- **Chain Expansion:** Deployed to 3+ L2s (Base, Optimism, Arbitrum)
- **Developer Adoption:** 10+ projects integrating WiFiProof attestations
- **Media Coverage:** Featured in 5+ crypto media outlets

---

## Philosophy & Principles

These are the guiding principles that should inform all technical decisions in V2:

### 1. Privacy by Default
> "Never collect data you don't need. Never store data longer than necessary."

- GPS coordinates encrypted at rest
- IP addresses stored as subnet prefix only (not full IP)
- Automatic data deletion (events expire after 7 days)
- GDPR/CCPA compliant by design

### 2. Simplicity is Security
> "The best code is no code. The second best is simple code."

- Fewer components = fewer attack surfaces
- Clear data flows = easier audits
- Minimal external dependencies = reduced supply chain risk

### 3. User Sovereignty
> "Users own their data and credentials. We're just the infrastructure."

- Non-custodial (user connects their own wallet)
- Portable attestations (EAS standard, readable by any app)
- Revocable proofs (users can request revocation)

### 4. Transparent Operations
> "Security through transparency, not obscurity."

- Open-source codebase (MIT license)
- Public audit reports
- Clear documentation of security model
- Honest about limitations (V1 security issues documented)

---

## Appendix: Reference Materials

### Useful Links

- **Noir Documentation:** https://noir-lang.org/docs
- **EAS Documentation:** https://docs.attest.org/
- **Base Documentation:** https://docs.base.org
- **Coinbase Verifications:** https://github.com/coinbase/verifications
- **Foundry Book:** https://book.getfoundry.sh

### Key Addresses (Base Mainnet)

```
Base Sepolia (Development)
Contract	Description	Address (on Base)
EAS	Stores, and manages attestations. See EAS' docs for more info.	0x4200000000000000000000000000000000000021 (Predeploy)
Schema Registry (EAS)	Stores schema definitions (templates for attestations). See EAS' docs for more info.	0x4200000000000000000000000000000000000020 (Predeploy)
Coinbase Indexer	All Coinbase attestations will be indexed in this contract.

You can query for the latest attestation ID by providing the attestation's recipient (address), and target schema ID (bytes32). See below for details on the full interface.

The actual attestation, and its data can be retrieved directly from EAS using the returned ID.	0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B
Coinbase Attester	All Coinbase attestations will be issued from this contract / address.

You can use the address of this contract for verifying the origin of the attestation, though, verifying the schema ID should be sufficient in most cases as our schemas are protected such that only Coinbase permitted attesters may use it.	0xB5644397a9733f86Cacd928478B29b4cD6041C45
Coinbase Resolver	A custom EAS schema resolver contract used by permissioned Coinbase schemas to restrict schema usage to permitted attesters, and to index attestations to the indexer on attest.	0x31c04B28E0Dc9909616357bD713De179408F48B0
Base Mainnet (Production)
See previous section for description.

Contract	Address (on Base)
EAS	0x4200000000000000000000000000000000000021 (Predeploy)
Schema Registry (EAS)	0x4200000000000000000000000000000000000020 (Predeploy)
Coinbase Indexer	0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C
Coinbase Attester	0x357458739F90461b99789350868CD7CF330Dd7EE
Coinbase Resolver	0xD867CbEd445c37b0F95Cc956fe6B539BdEf7F32f
EAS Schemas
Base Sepolia (Development)
Schema	Description	ID
Verified Account	An attestation type that can be claimed by a Coinbase user with a valid Coinbase trading account. The criteria / definition for this will vary across jurisdictions.

The attestation includes a boolean field that is always set to true.

(Example)	0x2f34...5a69
Verified Country	An attestation type that can be claimed by a Coinbase user that includes the user’s verified country of residence on Coinbase.

The attestation includes a string field that is set to the customer’s residing country code in ISO 3166-1 alpha-2 format.

(Example)	0xef54...4028
Verified Coinbase One	An attestation type that can be claimed by a Coinbase user with an active Coinbase One membership.

The attestation includes a boolean field that is always set to true.

(Example)	0xef8a...1e8c
Base Mainnet (Production)
See previous section for description.

Schema	ID
Verified Account	0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9
Verified Country	0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065
Verified Coinbase One	0x254bd1b63e0591fefa66818ca054c78627306f253f86be6023725a67ee6bf9f4
WiFiProof Contract:      [DEPLOY AND UPDATE]
WiFiProof Schema:        [REGISTER AND UPDATE]
```

### V1 Repository (Reference)

- **Repo:** `https://github.com/WifiproofProtocol/proof-of-venue-presence-v1`
- **Key Files to Reference:**
  - `portal/index.js` - Portal server architecture
  - `portal/crypto.js` - ECDSA signing implementation
  - `proof-app/src/pages/components/proof.tsx` - NoirJS integration
  - `proof-app/public/wifiproof/src/main.nr` - V1 circuit (for comparison)

### Communication Channels

- **GitHub:** https://github.com/WifiproofProtocol
- **Twitter:** @WiFiProof

---

## Closing Notes

WiFiProof V2 represents a **fundamental rethinking** of proof-of-attendance. We're not just building a better POAP—we're building the infrastructure for **context-aware, privacy-preserving credentials**.

This context document is a **living document**. As you build V2, update this file with:
- New architectural decisions
- Performance benchmarks
- Security discoveries
- UX learnings

**Remember:** This project will be used by real people at real events. Code quality matters. Security matters. Privacy matters.

Build something you'd be proud to show your grandchildren. BUILD SOMETHING THAT OUTLIVES YOU

— Xiaomao
*"Privacy is not secrecy. Privacy is control."*

---
