# WiFiProof

When people arrive at a hackathon, conference, or venue, one of the first things they ask is:

**What is the Wi-Fi password?**

That moment inspired WiFiProof.

If someone is connecting to the venue Wi-Fi, standing inside the event radius, and passing the event's attendance checks, that is a much stronger signal of real presence than a QR screenshot, a spreadsheet, or a transferable NFT claim.

WiFiProof is a privacy-by-design proof-of-attendance protocol. It lets someone prove they were physically present at an event without exposing unnecessary personal data.

## PL Genesis Submission Summary

WiFiProof is a privacy-preserving proof-of-attendance protocol for real-world events. It started from a simple observation: when people arrive at a hackathon, conference, or venue, one of the first things they ask is, “What’s the Wi-Fi password?” That moment is already a strong local signal of physical presence. WiFiProof builds on that idea and turns it into a stronger attendance flow that does not rely on screenshots, forwarded links, spreadsheets, or transferable NFTs.

The core problem WiFiProof addresses is that most attendance systems are both weak and invasive. They are often easy to fake, and they frequently collect names, emails, phone numbers, or other personal details that are not actually necessary just to prove one simple fact: that someone was there. WiFiProof takes a narrower, privacy-by-design approach. It focuses on proving presence and leaves everything else out of the claim unless it is absolutely needed.

In the current build, organizers create an event by setting venue coordinates, a radius, an event window, and a venue Wi-Fi subnet. Attendees then connect a wallet, verify humanity with World ID, pass a venue network check, generate a local zero-knowledge proximity proof in the browser, and claim an onchain attendance attestation on Base Sepolia. The attendance record is issued as an EAS attestation rather than a transferable NFT, making it a better fit for verifiable presence.

WiFiProof meaningfully integrates multiple sponsor technologies. Lit Protocol is used for programmable signing and authorization, so the system can issue required EIP-712 signatures through Lit Chipotle PKP infrastructure instead of depending on a plain server key. Storacha is used to archive claim artifacts and metadata in durable, content-addressed storage for auditability and retrieval. The project also uses World ID for proof of personhood, Noir and Barretenberg for private proximity proofs, Base as the settlement layer, and Supabase for event metadata and indexing.

This submission targets the **Existing Code** track. The hackathon work focused on deepening sponsor integrations, improving wallet UX, tightening the verification pipeline, adding Base ecosystem features like Builder Codes and a smart-wallet sponsorship path, and turning the prototype into a more credible end-to-end protocol demo for real event attendance.

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

## Hackathon Changelog (Existing Code Track)

The following upgrades were added or significantly expanded during the PL Genesis build window:

- **World ID humanity verification**
  - added a proof-of-personhood gate for one-person-one-claim attendance flows
  - added backend verification, token issuance, and nullifier enforcement per event

- **Lit Protocol signing via Chipotle**
  - replaced plain server-side signing assumptions with Lit-backed programmable signing
  - added Lit-based event/IP authorization flow for claim and organizer operations

- **Storacha archival**
  - added decentralized archival of claim artifacts and metadata after successful claims
  - added retrieval and indexing support for archived attendance records

- **Improved attendee and organizer UX**
  - redesigned success states for event creation and attendance claims
  - improved mobile wallet connection flow and wallet switching behavior
  - strengthened the landing page with live stats, latest attestation display, and FAQ content

- **Base ecosystem upgrades**
  - added ERC-8021 Builder Codes attribution for organizer and attendee transactions
  - added a guarded smart-wallet sponsorship path with a server-side CDP paymaster proxy

- **Architecture and roadmap documentation**
  - added deeper protocol documentation, implementation specs, and submission-ready project context
  - documented the contract v2 path for relayed claims, future organizer fees, and classroom mode

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

4. **classroom mode**
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

## Notes for judges and reviewers

This repo reflects the current WiFiProof build. The verification stack is fully operational on Base Sepolia — organizers can create events, attendees can claim, and every successful claim mints a real EAS attestation on-chain.

A few things worth knowing when reviewing the code:

- The ZK circuit is in `packages/proof-app/circuit` — it is a Noir circuit that proves the attendee is within the event radius using Euclidean distance without revealing exact coordinates
- The on-chain verifier is generated from the circuit using UltraHonk and deployed alongside the main contract in `packages/contracts`
- Lit Protocol signing is in `packages/web/src/lib/lit-signer.ts` — the app uses a Chipotle PKP to issue EIP-712 authorization signatures so no raw server key is involved
- Storacha archival happens after a successful claim in `packages/web/src/app/api/claims/archive`
- The paymaster proxy is at `packages/web/src/app/api/paymaster` — it validates and forwards to the CDP paymaster URL so the key is never exposed client-side

The next contract version will add relayed claims for EOAs and smart wallets, organizer fee support, and a proxy-based upgrade path.

## License

This repository is released under the [MIT License](./LICENSE).
