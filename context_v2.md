# WiFiProof V2: Project Context

**Last Updated:** March 31, 2026  
**Author:** Xiaomao ([wamimi](https://github.com/wamimi))  
**Project Status:** Live prototype on Base Sepolia, with contract v2 and expanded attendance modes planned next

---

## Table of Contents

1. [Project Snapshot](#project-snapshot)
2. [Why WiFiProof Exists](#why-wifiproof-exists)
3. [Current Architecture](#current-architecture)
4. [Current Verification Flow](#current-verification-flow)
5. [What Is Implemented Today](#what-is-implemented-today)
6. [What Comes Next](#what-comes-next)
7. [Appendix A: V1 Learnings](#appendix-a-v1-learnings)
8. [Appendix B: Design History and Rejected Directions](#appendix-b-design-history-and-rejected-directions)

---

## Project Snapshot

WiFiProof is a **privacy-by-design proof-of-attendance protocol** for real-world events.

It started from a simple observation:

> When people arrive at a hackathon, conference, meetup, or venue, one of the first things they ask is: **what is the Wi-Fi password?**

That moment is already a local signal of physical presence.

WiFiProof builds on that idea and combines:

- **venue network context** as a local signal
- **zero-knowledge proximity proofs** so exact coordinates stay private
- **humanity checks** for one-person-one-claim attendance
- **onchain attestations** so the record is portable and verifiable

The goal is not to collect names, emails, or unnecessary metadata just to prove a simple fact.

The goal is to prove:

**a real person was physically here**

while keeping the claim as narrow and privacy-preserving as possible.

### Current product framing

Today, WiFiProof is best understood as:

- a stronger attendance system for hackathons, conferences, and demos
- a privacy-preserving alternative to check-in tools that over-collect data
- a protocol that can grow into anti-fraud classroom attendance and institutional verification

### Current chain posture

WiFiProof is currently **Base-native**, not chain-agnostic.

The Solidity is EVM-compatible, but the product depends on:

- **Base Sepolia**
- **EAS**
- **Base / Coinbase ecosystem integrations**
- current frontend and backend assumptions around Base tooling

So while some pieces are portable in theory, the current product is designed around Base.

---

## Why WiFiProof Exists

Most attendance systems fail in one or more of these ways:

- they are easy to fake with a screenshot, forwarded QR code, or shared link
- they over-collect personal data that has nothing to do with presence
- they use transferable records that do not actually prove attendance

WiFiProof takes a narrower and stronger approach.

Instead of asking for extra identity data by default, it tries to verify only what matters for attendance:

- **was the attendee at the venue?**
- **did they satisfy the local conditions of the event?**
- **can the resulting attendance record be verified later?**

This also makes WiFiProof a useful foundation for settings like:

- web3 events
- conferences
- hackathons
- community meetups
- classroom and lecture attendance, where anti-fraud matters

In classroom mode, the problem is not just "did someone open the page?"  
It is:

**did the right student actually show up in the room?**

That is why WiFiProof is evolving toward a multi-mode attendance system rather than a single narrow web3 check-in flow.

---

## Current Architecture

WiFiProof currently consists of four main layers:

### 1. Web app

The web app lives in `packages/web` and handles organizer and attendee flows.

Current stack:

- **Next.js App Router**
- **Tailwind CSS**
- **wagmi**
- **viem**
- **Reown AppKit**
- **TanStack React Query**

This is the main product surface for:

- organizer event creation
- attendee claim flow
- wallet connection
- mobile and desktop UX
- protocol stats and landing pages

### 2. Zero-knowledge proof layer

The proof system lives in `packages/proof-app` and `packages/contracts`.

Current approach:

- **Noir** for the circuit
- **Barretenberg / UltraHonk** for proving and verifier generation
- client-side proof generation in the browser

The important property is:

- the attendee's exact coordinates do **not** need to be revealed to the server
- the browser proves proximity to the venue instead

### 3. Backend and indexing layer

The app uses backend routes and Supabase for:

- event metadata
- world verification records
- archived claim metadata
- protocol stats
- signer / authorization orchestration

This layer is also where current humanity and venue checks are coordinated before the onchain claim.

### 4. Onchain layer

The onchain layer currently runs on **Base Sepolia** and uses:

- **Solidity + Foundry**
- **EAS** for attendance attestations
- the deployed WiFiProof contract

Today, the attendance record is an **attestation**, not a transferable NFT.

That distinction matters. WiFiProof is not trying to create a collectible. It is trying to create a verifiable attendance record.

### Supporting integrations

The current build also integrates:

- **World ID** for proof of personhood 
- **Lit Protocol (Chipotle)** for programmable signing and EIP-712 authorizations
- **Storacha** for claim artifact archival
- **Base Builder Codes** for transaction attribution
- **CDP paymaster path** for smart-wallet sponsorship where supported

### Current contract reality

The currently deployed contract is **not upgradeable**.

That means:

- the live contract remains the current production-like history anchor
- future major changes belong in a **contract v2**
- contract v2 should be deployed behind an **upgradeable proxy**

This is especially relevant for:

- organizer fee support
- relayed claims for EOAs
- universal sponsorship

---

## Current Verification Flow

The current WiFiProof flow is built around layered verification.

### Organizer flow

1. Organizer connects a wallet
2. Organizer creates an event with:
   - venue coordinates
   - venue radius
   - venue subnet prefix
   - event window
   - event metadata
3. Event configuration is stored offchain
4. Event creation is finalized onchain

### Attendee flow

1. Attendee opens the event claim page
2. Attendee connects a wallet
3. Attendee completes **World ID** verification
4. Backend verifies the attendee is on the expected venue network
5. Browser generates a **zero-knowledge proximity proof**
6. Claim authorization is signed through the current signer flow
7. Attendee submits the claim transaction
8. Contract verifies the claim and mints an **EAS attestation**
9. Claim artifacts are archived to **Storacha**

### Current verification stack

Today, the live build uses these layers:

1. **World ID**
   - the current proof-of-personhood gate
   - used to make the hackathon version one-person-one-claim

2. **Venue network check**
   - backend verifies the request is coming from the expected subnet range

3. **ZK proximity proof**
   - browser proves the attendee is within the configured venue radius

4. **Lit-backed authorization**
   - the app uses Lit infrastructure for structured signing flows

5. **EAS attestation**
   - successful claims mint a wallet-bound attendance record on Base Sepolia

6. **Storacha archival**
   - claim artifact and related metadata are archived for retrieval and auditability

### Current gas model

Gas sponsorship is **partially implemented** today:

- **smart-wallet capable users** can use the CDP paymaster path when supported
- **EOAs** still use the normal direct transaction path

Universal sponsorship for both EOAs and smart wallets requires **contract v2**.

---

## What Is Implemented Today

The current build already supports:

- organizer event creation
- attendee attendance claiming
- World-based humanity verification
- venue subnet verification
- client-side zero-knowledge proximity proving
- Lit-based signing and authorization
- EAS attestations on Base Sepolia
- Storacha archival of claim artifacts
- Reown AppKit wallet UX
- Builder Codes attribution
- guarded smart-wallet sponsorship path
- live landing-page stats and latest-attestation display

### What the homepage stats currently mean

The product has two related but different record types:

- **onchain attendance claims / attestations**
- **archived claim artifacts**

These should not be conflated.

The attendance attestation is the true attendance record.  
The archived artifact is the stored claim payload and related metadata.

This distinction matters for protocol analytics and for how the landing page is presented.

### What the current build does not yet do

The current build still does **not** include:

- live room challenge
- organizer dashboard
- organizer fee onchain
- universal gas sponsorship for EOAs
- institutional identity mode
- full classroom mode

Those belong to the next implementation phase.

---

## What Comes Next

The next phase should stay tightly scoped and practical.

### 1. Contract v2

Contract v2 should introduce:

- relayed claims for **EOAs and smart wallets**
- organizer fee support
- cleaner sponsorship architecture
- upgradeable deployment strategy

The current contract should remain as the historical v1/v1.5 deployment.

### 2. Live room challenge

This is the next major attendance-hardening layer.

The intended shape is:

- organizer enables check-in mode
- a shared QR code and manual code rotate every 20 to 30 seconds
- attendee redeems the current room code
- backend issues a short-lived wallet-bound challenge token
- claim can proceed only if the challenge token is valid

This is important because it adds an **in-room visibility signal**, not just network and proximity.

### 3. Mobile-first attendee UX

If the claim flow depends on scanning QR codes and using wallets on phones, mobile UX cannot be an afterthought.

This work includes:

- smoother wallet connect flows
- better resume behavior after wallet or World app redirects
- clearer claim status messaging
- better handling of supported vs unsupported sponsorship paths

### 4. Organizer dashboard

Organizers need a usable operator surface.

Minimum dashboard goals:

- event list
- per-event attendance stats
- claim counts
- humanity-verified counts
- operator tools for event management

### 5. Multi-mode identity roadmap

WiFiProof should become **multi-mode**, not single-mode.

#### Open event mode

Designed for hackathons, conferences, and community events:

- wallet
- World ID
- venue network check
- live room challenge
- ZK proximity proof

#### Institutional mode

Designed for classrooms and structured attendance:

- school-issued identity or SSO
- passkeys for returning login
- venue network check
- live room challenge
- ZK proximity proof

In institutional mode, **student identity** is the uniqueness anchor.  
In open event mode, the current hackathon build uses **World ID**.

### 6. Humanity-provider abstraction

The long-term direction should be:

- keep the contract agnostic to a single humanity provider
- let the backend accept different proof-of-personhood modes

Likely future providers:

- World ID
- institutional credentials
- possibly BrightID or other providers later

BrightID is worth keeping in the research set, but it is not the current default path.

---

## Appendix A: V1 Learnings

WiFiProof V1 matters because it proved the core primitive, even though the product shape had serious weaknesses.

### What V1 proved

V1 established that **WiFi connectivity can be used as a meaningful attendance primitive**.

It demonstrated:

- browser-based proof generation
- event-scoped proof flows
- production-style infrastructure patterns
- the viability of combining venue context with onchain verification

### V1 architecture

V1 used a portal-style model:

- a dedicated organizer or venue server
- signed nonces based on local network access
- browser-generated proofs
- onchain verification

At the time, this was a useful exploration because it forced the protocol to answer an important question:

**can network context be treated as part of attendance verification?**

The answer was yes.

### Main V1 limitations

#### 1. Extractable local secrets

V1 relied too heavily on browser-held secrets and local state.

That created an obvious problem:

- if a secret can be copied
- it can be shared
- and the attendance guarantee weakens immediately

#### 2. Multi-device exploitation

A single person with multiple devices could produce multiple claims.

That meant:

- one human was not actually one claimant
- rewards and anti-fraud use cases were vulnerable

#### 3. Portal infrastructure burden

V1 placed too much responsibility on organizers:

- run a server
- manage infra
- handle availability
- deal with operational issues at the event itself

That is too much overhead for a product that should feel lightweight.

#### 4. Weak humanity layer

The humanity / Sybil-resistance layer was not strong enough.

This became the core design pressure that pushed V2 toward stronger proof-of-personhood thinking.

### Key V1 conclusion

The **WiFi primitive was real**, but the surrounding identity and operational model needed to change.

That insight is the bridge between V1 and the current V2 direction.

---

## Appendix B: Design History and Rejected Directions

This appendix keeps the reasoning trail intact. These directions were important to explore even when they were not the final answer.

### 1. Browser-based physical presence research

Several proof-of-location directions were investigated early:

- zkLocus
- WitnessChain
- EigenCloud-style latency approaches

The main issue was that many of these systems were designed for:

- infrastructure nodes
- hardware participation
- or assumptions browsers cannot satisfy

That made them a poor fit for a user-facing mobile and web attendance product.

This is what pushed the design back toward:

- browser-generated ZK proximity proofs
- simpler venue-local signals

### 2. NFTs vs attestations

Transferable NFTs were not a good fit for attendance.

Even when they work well as collectibles, they are not ideal as evidence that:

- a specific wallet attended a specific event
- under specific conditions

That is why WiFiProof moved toward **EAS attestations** rather than treating attendance as an NFT minting problem.

### 3. Coinbase KYC as the original humanity plan

An earlier V2 direction centered on:

- Coinbase verification
- Coinbase-issued attestations
- KYC as the uniqueness anchor

This was a serious design path, not a random idea. It came from a very real concern:

> If one person can claim from many devices and many wallets, attendance loses credibility.

The Coinbase path was attractive because it offered:

- strong identity backing
- onchain verification context
- a credible anti-Sybil anchor

However, it is **not the current shipped model**.

The current hackathon build uses **World ID** as the active humanity layer instead.


### 4. Embedded-wallet-first UX

Embedded wallets were explored as a UX simplification path.

The problem was not that embedded wallets are bad. The problem was that:

- easier wallet creation does not automatically mean stronger uniqueness
- an attendance product still needs a credible human-bound signal

That is why the current product does not frame embedded wallets as the full answer to attendance integrity.

They may still become part of future classroom or consumer onboarding flows, but not as a substitute for personhood.

### 5. BrightID exploration

BrightID remains interesting because it is privacy-aligned and social-graph-based.

But it is not currently the right default for WiFiProof event-day claims.

Why:

- onboarding friction is non-trivial
- meaningful verification usually has to exist before the event
- scanning a QR at an event does not instantly produce strong uniqueness

So BrightID stays in the research set, but not on the critical path.

### 6. Chain-agnostic deployment

It is reasonable to ask whether WiFiProof should be deployable anywhere EVM-compatible.

The answer is nuanced:

- some Solidity pieces are portable
- the current **product** is not chain-agnostic

Because the current implementation depends on:

- Base Sepolia
- EAS
- Base / Coinbase integrations
- current frontend assumptions around Base-native flows

That means portability is a future architectural question, not a current requirement.

### 7. Final design lesson

The most important design lesson from this history is:

WiFiProof is not just a smart contract or just a check-in page.

It is a layered attendance system that has to balance:

- privacy
- usability
- real-world anti-fraud
- protocol credibility
- low-friction event operations

The design will keep evolving, but that balance is the constant.
