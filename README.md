# WiFiProof

**Live:** [wifiproof.xyz](https://wifiproof.xyz)

**Contract:** [`0x9EE31e7c48Fe84ad888d4Bf2d5DF809C7E137A4A`](https://sepolia.basescan.org/address/0x9EE31e7c48Fe84ad888d4Bf2d5DF809C7E137A4A) — Base Sepolia

**EAS Schema:** [`0x205141ca00c9cf450dd494ed27fe04106e3be40c805e8e3c1257d5d005f2b80c`](https://base-sepolia.easscan.org/schema/view/0x205141ca00c9cf450dd494ed27fe04106e3be40c805e8e3c1257d5d005f2b80c) — `bytes32 eventId, string venueName, uint64 timestamp, bool verifiedLocation, bool verifiedNetwork`

---

When people arrive at a classroom, hackathon, conference, or venue, one of the first things they ask is:

**What is the Wi-Fi password?**

That moment inspired WiFiProof.

If someone is connecting to the venue Wi-Fi, standing inside the event radius, and passing the event's attendance checks, that is a much stronger signal of real presence than a QR screenshot, a spreadsheet, or a transferable NFT claim.

WiFiProof is a privacy-by-design proof-of-attendance protocol. It lets someone prove they were physically present at an event without exposing unnecessary personal data.

## Platform Overview

WiFiProof is a privacy-preserving proof-of-attendance protocol for real-world events. It started from a simple observation: when people arrive somewhere real, one of the first things they ask is, “What’s the Wi-Fi password?” That moment is already a strong local signal of physical presence. WiFiProof builds on that idea and turns it into a stronger attendance flow that does not rely on screenshots, forwarded links, spreadsheets, or transferable NFTs.

The core problem WiFiProof addresses is that most attendance systems are both weak and invasive. They are often easy to fake, and they frequently collect names, emails, phone numbers, or other personal details that are not actually necessary just to prove one simple fact: that someone was there. WiFiProof takes a narrower, privacy-by-design approach. It focuses on proving presence and leaves everything else out of the claim unless it is absolutely needed.

In the current build, organizers create an event by setting venue coordinates, a radius, an event window, and a venue Wi-Fi subnet. Attendees then connect a wallet, verify humanity with either World ID or a Coinbase Verified wallet path, pass a venue network check, generate a local zero-knowledge proximity proof in the browser, and claim an onchain attendance attestation on Base Sepolia. The attendance record is issued as an EAS attestation rather than a transferable NFT, making it a better fit for verifiable presence.

WiFiProof uses Lit Protocol for programmable signing and authorization, so the system can issue required EIP-712 signatures through Lit Chipotle PKP infrastructure instead of depending only on a plain server key. The project also uses World ID and Coinbase Verified for humanity checks, Noir and Barretenberg for private proximity proofs, Base as the settlement layer, and Supabase for event metadata and indexing. Optional archival can still happen after claim settlement, but it is not part of the core verification story.

WiFiProof is best understood as a platform. The same verification foundation can power Web3-native event flows, institution-led attendance systems, and custom presence-verification products where the blockchain layer may be explicit or mostly invisible to the end user.

## What WiFiProof does

WiFiProof combines:

- **venue Wi-Fi context** as a local network signal
- **zero-knowledge geolocation** so exact coordinates stay private
- **humanity checks** for one-person-one-claim events
- **on-chain attestations** so the attendance record is portable and verifiable

Instead of asking for a name, email, phone number, or any extra data that has nothing to do with attendance, WiFiProof focuses on a smaller claim:

**prove presence, mint the record, leave everything else out of it.**

## Why it exists

Most attendance systems are weak in at least one of these ways:

- they are easy to fake or forward
- they over-collect personal data
- they issue transferable records that do not actually prove physical presence

WiFiProof is designed to be stronger on all three:

- harder to fake
- privacy-preserving by default
- tied to real attendance conditions

## Current verification stack

Today, WiFiProof uses these layers:

1. **World ID**
   - available as a proof-of-personhood gate
   - helps prevent the same human from claiming multiple times with different wallets

2. **Coinbase Verified**
   - supported as an onchain humanity path for verified Base wallets
   - fits Base-native demo flows and smart-wallet onboarding

3. **Venue network check**
   - the backend verifies that the request is coming from the expected venue network range

4. **ZK proximity proof**
   - the browser generates a zero-knowledge proof that the attendee is within the allowed event radius
   - exact coordinates never leave the device

5. **Lit Protocol signer**
   - server authorizations are signed through Lit Chipotle PKP infrastructure
   - the app uses Lit for EIP-712 authorization signatures and can fall back to a plain server key if Lit is unavailable

6. **EAS attestation**
   - successful claims mint an Ethereum Attestation Service record on Base Sepolia
   - the output is an attestation, not a transferable NFT

## Why attestations instead of NFTs

WiFiProof uses **attestations** because they are a better fit for attendance than NFTs.

NFTs are often treated like collectibles or assets. That is not the point here.

An attendance record should answer:

- who attended
- which event
- when it happened

An EAS attestation is much closer to that model than a speculative token.

## Real-world use cases

### Web3 events and conferences

WiFiProof helps organizers run stronger attendance flows for hackathons, demos, meetups, and conferences.

### Universities, classrooms, and training programs

WiFiProof can also be used in lecture halls or classrooms where the problem is not just recording attendance, but making it harder to fake.

A lecturer could configure:

- the classroom Wi-Fi or local network
- the classroom radius
- the event window

Then students would need to satisfy both the physical and contextual checks instead of just sharing a link remotely.

Institutional deployments are designed to use existing identity systems where possible, so WiFiProof focuses on presence verification instead of replacing school identity.

### Custom verification products

WiFiProof can also be offered as infrastructure for teams that want privacy-preserving presence verification inside their own product, with onchain or offchain record outputs depending on the use case.

## What is in this repo

The repo is organized into four packages:

- `packages/proof-app`
  - Noir circuit and browser proving runtime

- `packages/contracts`
  - Solidity contracts and verifier

- `packages/web`
  - Next.js app for organizer and attendee flows

- `packages/common`
  - shared helpers and venue-hash logic

## Main integrations

- **Noir + Barretenberg**
  - local zero-knowledge proof generation

- **Base**
  - settlement layer

- **EAS**
  - attendance attestations

- **World ID**
  - proof-of-personhood option

- **Coinbase Verified**
  - Base-native humanity option

- **Lit Protocol (Chipotle)**
  - programmable signer infrastructure

- **Supabase**
  - event metadata and verification records

## What is live today

The current build supports:

- organizer event creation
- attendee claim flow
- World ID and Coinbase-based humanity checks
- Lit-signed event and IP authorization
- EAS attendance attestations
- Lit-to-key signer fallback for operational resilience
- Reown wallet connection
- live protocol stats on the landing page

## What is next

The next implementation phase is:

1. **contract v2**
   - relayed claims for EOAs and smart wallets
   - organizer fee support
   - upgradeable proxy-based deployment

2. **live room challenge**
   - rotating QR/manual code
   - stronger in-room attendance signal


3. **organizer dashboard**
   - per-event attendance stats and operator tools

4. **institution mode**
   - institutional identity, passkey-friendly access modes, and anti-fraud attendance

## The proof system

The ZK circuit is written in Noir and proves Euclidean distance — that the attendee's GPS coordinates are within the configured venue radius — without revealing the exact coordinates.

The circuit is compiled with Noir and the verifier is generated using Barretenberg's UltraHonk backend. Proofs are approximately 28KB, generated client-side in WebAssembly in a few seconds on a mobile browser, and verified on-chain by the deployed UltraHonk verifier contract.

## Quick start

### Install

```bash
pnpm install
```

### Run the web app

```bash
pnpm --filter web dev
```

### Required environment variables

Create `packages/web/.env.local` with:

```bash
# Contract
NEXT_PUBLIC_WIFIPROOF_ADDRESS=0x9EE31e7c48Fe84ad888d4Bf2d5DF809C7E137A4A
NEXT_PUBLIC_WIFIPROOF_DEPLOYMENT_BLOCK=38377983
NEXT_PUBLIC_BASE_RPC_URL=https://sepolia.base.org

# Lit Protocol
LIT_NETWORK=chipotle
LIT_CHIPOTLE_PKP_ADDRESS=<your pkp address>
LIT_PKP_PRIVATE_KEY=<your pkp private key>
LIT_API_URL=https://api.dev.litprotocol.com

# World ID
NEXT_PUBLIC_WORLD_APP_ID=<your world app id>
NEXT_PUBLIC_WORLD_ACTION_ID=<your world action id>

# Humanity tokens
WORLD_TOKEN_SECRET=<shared secret for World/Coinbase humanity tokens>

# Supabase
SUPABASE_URL=<your supabase url>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>

# Reown (WalletConnect)
NEXT_PUBLIC_REOWN_PROJECT_ID=<your project id>

# Base (optional — for sponsored claims)
CDP_PAYMASTER_URL=<your cdp paymaster url>
NEXT_PUBLIC_BASE_BUILDER_CODE=<your builder code>
NEXT_PUBLIC_APP_URL=https://wifiproof.xyz
```

### Useful package commands

```bash
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web insert-event
```

## Notes for judges and reviewers

This repo reflects the current WiFiProof build. The verification stack is fully operational on Base Sepolia — organizers can create events, attendees can claim, and every successful claim mints a real EAS attestation on-chain.

A few things worth knowing when reviewing the code:

- The ZK circuit is in `packages/proof-app/circuit` — it is a Noir circuit that proves the attendee is within the event radius using Euclidean distance without revealing exact coordinates
- The on-chain verifier is generated from the circuit using UltraHonk and deployed alongside the main contract in `packages/contracts`
- Lit Protocol signing is in `packages/web/src/lib/lit-signer.ts` — the app uses a Chipotle PKP to issue EIP-712 authorization signatures and can fall back to a local signer key when needed
- The attendee flow now supports both World ID and Coinbase Verified humanity checks
- The paymaster proxy is at `packages/web/src/app/api/paymaster` — it validates and forwards to the CDP paymaster URL so the key is never exposed client-side

The next contract version will add relayed claims for EOAs and smart wallets, organizer fee support, and a proxy-based upgrade path.

## License

This repository is released under the [MIT License](./LICENSE).
