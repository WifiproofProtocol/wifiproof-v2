# WiFiProof

When people arrive at a hackathon, conference, or venue, one of the first things they ask is:

**What is the Wi-Fi password?**

That moment inspired WiFiProof.

If someone is connecting to the venue Wi-Fi, standing inside the event radius, and passing the event's attendance checks, that is a much stronger signal of real presence than a QR screenshot, a spreadsheet, or a transferable NFT claim.

WiFiProof is a privacy-by-design proof-of-attendance protocol. It lets someone prove they were physically present at an event without exposing unnecessary personal data.

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
   - used as the current proof-of-personhood gate in the hackathon build
   - helps prevent the same human from claiming multiple times with different wallets

2. **Venue network check**
   - the backend verifies that the request is coming from the expected venue network range

3. **ZK proximity proof**
   - the browser generates a zero-knowledge proof that the attendee is within the allowed event radius
   - exact coordinates never leave the device

4. **Lit Protocol signer**
   - server authorizations are signed through Lit Chipotle PKP infrastructure
   - the app uses Lit for EIP-712 authorization signatures instead of relying only on a raw server key

5. **EAS attestation**
   - successful claims mint an Ethereum Attestation Service record on Base Sepolia
   - the output is an attestation, not a transferable NFT

6. **Storacha archival**
   - claim artifacts are archived to Storacha and indexed in Supabase
   - this gives a durable content link for the claim payload and receipt metadata

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

### Anti-fraud classroom attendance

WiFiProof can also be used in lecture halls or classrooms where the problem is not just recording attendance, but making it harder to fake.

A lecturer could configure:

- the classroom Wi-Fi or local network
- the classroom radius
- the event window

Then students would need to satisfy both the physical and contextual checks instead of just sharing a link remotely.

This classroom mode is part of the roadmap and will later use institutional identity instead of only web3-native identity flows.

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
  - current proof-of-personhood gate

- **Lit Protocol (Chipotle)**
  - programmable signer infrastructure

- **Storacha**
  - decentralized claim artifact archival

- **Supabase**
  - event metadata, world verifications, archived artifact index

## What is live today

The current build supports:

- organizer event creation
- attendee claim flow
- World-based humanity checks
- Lit-signed event and IP authorization
- EAS attendance attestations
- Storacha archival
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

3. **mobile-first attendee UX**
   - smoother wallet and verification flow on phones

4. **Base Account sponsorship**
   - gasless claims for smart-wallet users first

5. **organizer dashboard**
   - per-event attendance stats and operator tools

6. **classroom mode**
   - institutional identity and anti-fraud lecture attendance

## Quick start

### Install

```bash
pnpm install
```

### Run the web app

```bash
pnpm --filter web dev
```

### Useful package commands

```bash
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web insert-event
```

## Key docs

- [Architecture deep dive](./docs/architecture-deep-dive.md)
- [V2 implementation spec](./docs/v2-implementation-spec.md)
- [Project context](./context_v2.md)
- [PL Genesis notes](./docs/pl-genesis.md)

## Notes for judges and reviewers

This repo reflects the current WiFiProof build, including:

- World ID integration
- Lit Protocol signing via Chipotle
- Storacha archival
- EAS attestations
- mobile wallet work through Reown

The next contract version is already specified in [v2-implementation-spec.md](./docs/v2-implementation-spec.md), including:

- sponsorable relayed claims
- organizer fees
- proxy-based upgrades
- future classroom mode

## License

MIT
