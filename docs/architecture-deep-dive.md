# WiFiProof Architecture Deep Dive

focuses on:

- what each subsystem does
- what guarantees it actually gives
- what does and does not depend on trust
- what the likely hard questions are

> WiFiProof combines a privacy-preserving proximity proof, a venue-network check, and event-bound on-chain verification so someone can prove they were there without revealing their exact location.


## 1. System Overview

WiFiProof is a multi-layer attendance verification system. 
The core layers are:

1. **ZK geolocation proof**
   - proves the user was inside a configured radius around the venue
   - does not reveal the user's exact coordinates
   - generated entirely in the browser — raw coordinates never leave the device

2. **Venue network check**
   - checks that the request appears to come from the venue's expected network range
   - used as a local-presence signal tied to venue Wi-Fi
   - a backend-side check using the HTTP request IP, not a client-side declaration

3. **Event binding**
   - ties the proof and signature to a specific event so they cannot be replayed for another event
   - implemented in both the circuit (via `event_id` public input) and in EIP-712 typed signatures

4. **Identity / uniqueness layer**
   - World verification in the current web app (prevents the same human from claiming twice under different wallets)
   - optional Coinbase verified-account check in the contract

5. **On-chain attestation mint**
   - the contract re-checks the proof and signatures before minting the attendance record
   - nothing is trusted just because the client says so

This is an important design point:

- the circuit alone does **not** prove everything
- the Wi-Fi check alone does **not** prove everything
- the identity layer alone does **not** prove everything

 A determined attacker would have to simultaneously spoof GPS, be physically on the venue network, pass a biometric-linked identity check, and forge an EIP-712 signature from the backend signer. That is the threat model.

---

## 2. Repo Map

The repo is split into four main packages:

- `packages/proof-app`
  - the Noir circuit
  - the browser-side proof generation library

- `packages/contracts`
  - the WiFiProof smart contract
  - the generated Honk verifier contract

- `packages/web`
  - the Next.js app
  - organizer flow
  - attendee flow
  - API routes
  - Lit signer integration
  - Supabase, World, Storacha integrations

- `packages/common`
  - shared math and helpers, especially venue-hash encoding

Main files to know:

- Circuit source: `packages/proof-app/circuit/src/main.nr`
- Browser proving runtime: `packages/proof-app/src/index.ts`
- Organizer flow: `packages/web/src/app/organizer/OrganizerClient.tsx`
- Attendee flow: `packages/web/src/app/event/[eventId]/EventClient.tsx`
- Signer abstraction: `packages/web/src/lib/signer.ts`
- Lit signer: `packages/web/src/lib/lit-signer.ts`
- Contract: `packages/contracts/src/WiFiProof.sol`
- Generated verifier: `packages/contracts/src/Verifier.sol`
- Venue hash helper: `packages/common/src/venueHash.ts`

---

## 3. The ZK Part From Start to Finish

### 3.1 What the Noir circuit actually proves

The circuit in `packages/proof-app/circuit/src/main.nr` is intentionally small.

Inputs:

- private:
  - `user_lat`
  - `user_lon`

- public:
  - `venue_lat`
  - `venue_lon`
  - `threshold_sq`
  - `event_id`

The circuit computes:

- `delta_lat = user_lat - venue_lat`
- `delta_lon = user_lon - venue_lon`
- `distance_sq = delta_lat^2 + delta_lon^2`

Then it checks:

- `distance_sq < threshold_sq`

That is the entire core circuit claim:

> "My secret location is within the allowed venue radius for this event."

What it does **not** prove:

- that the browser geolocation API is honest
- that the user is on venue Wi-Fi
- that the user is a unique human
- that the user connected at the correct time

Those are handled outside the circuit. The circuit's job is the privacy-preserving math: prove the constraint without leaking the private inputs.

### 3.2 Why GPS coordinates are scaled

GPS values come in as decimals, for example:

- latitude: `-1.286389`
- longitude: `36.817223`

Circuits do not want floating-point math. They want integer-like field values.

So WiFiProof multiplies coordinates by `1_000_000` (`1e6`) in `packages/proof-app/src/index.ts`.

Examples:

- `36.817223` → `36817223`
- `-1.286389` → `-1286389`

Why `1e6`?

- `1e6` means `10^6`
- it preserves 6 decimal places
- 6 decimal places is roughly sub-meter precision, which is already more than enough for event-radius checks

This is a practical engineering choice:

- enough precision for venue boundaries
- simple integer arithmetic
- easier matching across TypeScript, Noir, and Solidity

When the organizer sets a radius, that radius in meters is converted into scaled-GPS units using the same factor, then squared to produce `threshold_sq`. Both the user coordinates and the threshold go through the same scaling, so the arithmetic inside the circuit is consistent.

### 3.3 What BN254 means here

Noir field arithmetic in this stack uses the BN254 scalar field.

BN254 (also called alt_bn128) is an elliptic curve. The ZK proving system (UltraHonk / Barretenberg) operates over the scalar field of that curve.


- all circuit values must be represented as valid elements of a finite field
- the field has a specific large prime modulus (`p ≈ 2^254`)
- the proving system and verifier contract both expect this format

The field has a large prime modulus:

- stored as `FIELD_MODULUS` in `packages/proof-app/src/index.ts`
- approximately `21888242871839275222246405745257275088548364400416034343698204186575808495617`

Field elements are always in the range:

- `0` to `p - 1`

Everything going into the circuit must be representable in that range.

### 3.4 Why negative coordinates are converted

Normal GPS coordinates can be negative:

- west longitudes are negative
- south latitudes are negative

But a field element cannot simply be "`-122419400`". In a finite field, there is no native signed integer. The field only contains values `0..p-1`.

So the code converts negative numbers modulo the BN254 field:

- `-x` becomes `p - x`

That is what `scaleGPS(...)` does in `packages/proof-app/src/index.ts`.

This is not specific to WiFiProof. It is a standard way of representing signed values inside a finite field.

The arithmetic still works correctly because field subtraction is modular. When the circuit computes `user_lat - venue_lat`, it is doing field subtraction, which handles the wrap-around correctly as long as both values were encoded consistently.

### 3.5 What `threshold_sq` means

`threshold_sq` means:

> the maximum allowed squared distance from the venue center

Why squared distance?

Because the circuit checks:

- `(delta_lat^2 + delta_lon^2) < threshold_sq`

Using squared distance avoids a square root, which is much simpler and cheaper in circuits. Square roots require iterative approximations or range proofs. Comparing squared values is just multiplication and comparison.

The conversion is:

1. start with the radius in meters
2. convert meters into scaled GPS degrees (using the same `1e6` scale factor + degrees-per-meter approximation)
3. square it

That logic is in `calculateThresholdSq(...)` in `packages/proof-app/src/index.ts`.



- radius = "how far from the venue center we still count as present"
- `threshold_sq` = that same boundary, but in squared field/integer form for the circuit

Example: if the organizer sets a 200-meter radius, the code converts that to a squared scaled GPS threshold. Any user whose scaled GPS coordinates satisfy `delta_lat^2 + delta_lon^2 < threshold_sq` passes.

### 3.6 What `event_id` means

`event_id` is the unique identifier for one event.

In the organizer flow, it is derived in:

- `packages/web/src/app/organizer/OrganizerClient.tsx`

Specifically:

- `eventSeed = venueName:start:end`
- `eventId = keccak256(eventSeed)`

Then the event ID is converted into a field element in:

- `eventIdToField(...)` in `packages/proof-app/src/index.ts`

Why include `event_id` in the circuit at all?

Because it binds the proof to a specific event.

Without that, a valid proof for one venue/radius could potentially be replayed in the wrong context. Adding the event ID as a public input means:

- the proof commits to a specific event
- the contract checks the event ID public input against the actual on-chain event
- if the IDs don't match, proof verification fails

This is the replay protection mechanism inside the circuit itself.

### 3.7 What a witness is

This is one of the most important definitions.

**Private inputs** are the secret values you provide to the circuit.

In WiFiProof, that is mainly:

- `user_lat`
- `user_lon`

**Witness** means the full hidden assignment that satisfies the circuit.

That includes:

- the private inputs
- the intermediate computations derived from them

In this circuit, the witness includes things like:

- `user_lat`
- `user_lon`
- `delta_lat`
- `delta_lon`
- `distance_sq`
- intermediate range-proof values (used by the `<` comparison inside the field)

So:

- private input = secret starting values
- witness = the complete hidden computational state used to satisfy the constraints

When NoirJS runs:

- `this.noir.execute(inputs)`

in `packages/proof-app/src/index.ts`, it computes that witness.

The prover then takes the witness and generates a proof: a compact cryptographic blob that says "I know a witness satisfying these constraints" without revealing the witness itself.

The verifier (both Barretenberg locally and the Solidity Verifier contract on-chain) can check the proof against the public inputs without ever seeing the private coordinates.

### 3.8 What `circuit.json` is

After running:

- `nargo compile`

the Noir circuit is compiled into:

- `packages/proof-app/circuit/target/circuit.json`

This file is the compiled circuit artifact. It contains:

- ABI information (input/output names and types)
- ACIR bytecode (Arithmetic Circuit Intermediate Representation — a flattened, constraint-based representation of the circuit)
- debug symbols
- file mapping metadata

Important:

- it is **not** the proof
- it is **not** the witness
- it is **not** Solidity bytecode

It is the compiled representation that NoirJS and Barretenberg use to generate proofs.

The key idea is:

- source circuit: `main.nr`
- compiled artifact: `circuit.json`
- runtime proving uses that compiled artifact in the browser

When a user lands on an event page and starts the claim flow, the browser dynamically imports this `circuit.json` file, creates the Noir runtime, and uses it to execute the circuit and generate a proof. This means every attendee proves locally without anything sensitive hitting the server.

### 3.9 What the other files in `target/` are

The `packages/proof-app/circuit/target` folder contains several different artifacts:

- `circuit.json`
  - compiled Noir circuit artifact (used at runtime)

- `circuit.gz`
  - witness artifact from local `nargo execute`

- `proof`
  - proof generated by local CLI proving

- `public_inputs`
  - public inputs from local CLI proving

- `vk`
  - verification key (a commitment to the circuit structure used by the verifier)

- `vk_hash`
  - hash of the verification key

These are useful to understand:

- `circuit.json` is for runtime / proving integration
- `vk` is for verifier generation — the `Verifier.sol` contract hardcodes a commitment derived from this key
- `proof` and `public_inputs` are example local outputs from CLI proving, useful for testing

The verification key is critical: it encodes the exact structure of the circuit. If you change even one constraint in `main.nr` and recompile, the `vk` changes, and the old `Verifier.sol` will reject proofs from the new circuit (and vice versa). This is why you need to regenerate the verifier contract whenever the circuit changes.

### 3.10 How browser proving works

Browser proving happens in both:

- organizer flow
- attendee flow

The proving runtime is in:

- `packages/proof-app/src/index.ts`

The flow is:

1. dynamically import `circuit.json`
2. create a `Noir` instance from that compiled artifact
3. create a Barretenberg / UltraHonk backend (this initializes the WASM-based prover)
4. build the circuit inputs (scale GPS, compute threshold, encode event ID)
5. execute the circuit to compute the witness
6. generate the proof with `verifierTarget: "evm"` so the output is compatible with the on-chain verifier

The core code path is:

- `new Noir(circuit)`
- `new UltraHonkBackend(circuit.bytecode, api)`
- `this.noir.execute(inputs)` → witness
- `this.backend.generateProof(witness, { verifierTarget: "evm" })` → proof + public inputs

This is important:

- the browser computes the proof locally
- the browser does not send the raw user coordinates to the backend
- the proving uses Barretenberg compiled to WebAssembly — the prover runs as WASM in-browser

What the browser later sends onward is:

- the proof bytes (a compact blob, not raw values)
- the public inputs (venue lat, venue lon, threshold_sq, event_id — not the user's location)

The first time a user does this, there may be a delay while the WASM module loads and initializes. After that, proving takes a few seconds on a modern device.

### 3.11 Why the circuit uses `<` and not `<=`

The circuit currently uses:

- strict less-than

This means:

- if someone is exactly on the mathematical boundary, the proof fails

Is that bad?

Not necessarily. It is a design choice.

Pros of `<`:

- slightly stricter
- avoids some edge-case ambiguity at the boundary

Cons:

- someone exactly at the boundary may fail because of rounding

For product UX, two common choices are:

- keep `<` and use a slightly generous radius
- or switch to `<=`

The current implementation is acceptable, but it is worth knowing this behavior so you can explain why a near-edge test may fail.

### 3.12 UltraHonk vs Groth16

WiFiProof uses **UltraHonk** (via Barretenberg), not Groth16.

This matters for two reasons:

1. **No trusted setup per circuit.** Groth16 requires a circuit-specific trusted setup ceremony. If the circuit changes, you need a new ceremony. UltraHonk uses a universal (structured reference string) setup — no per-circuit ceremony required.

2. **WASM proving in the browser.** Barretenberg has a well-maintained WASM build that works in modern browsers without plugins or native code. This is why proving can happen entirely in-browser.

The tradeoff is proof size and verification gas cost. UltraHonk proofs are larger than Groth16 proofs and cost more gas to verify on-chain. For a venue-check use case with infrequent claims, that tradeoff is fine.

---

## 4. Organizer Flow

The organizer flow is implemented in:

- `packages/web/src/app/organizer/OrganizerClient.tsx`

It performs several checks:

1. organizer enters:
   - venue name
   - venue center (lat/lon, from browser geolocation or manual entry)
   - radius (meters)
   - subnet prefix (the expected venue network range, auto-detected or manually entered)
   - event start/end time
   - event description and poster image

2. event ID is derived deterministically from:
   - `keccak256(venueName:start:end)`
   - this means two organizers creating the same event with the same parameters would produce the same ID, which is intentional — it ties the event identity to its content, not to a random nonce

3. venue hash is computed by the contract helper:
   - `computeVenueHashFromScaled(scaledLat, scaledLon, thresholdSq, eventId)`
   - this hash commits to the exact venue configuration

4. organizer browser gets geolocation and generates a ZK proof locally
   - the organizer proves *they are at the venue while creating the event*
   - this is the same circuit as the attendee proof

5. backend route `/api/events/authorize` checks:
   - organizer is allowlisted (wallet is in the approved organizer list in Supabase, or is the contract owner)
   - client is on the expected venue subnet (subnet prefix match on request IP)
   - proof is valid (Barretenberg verifies locally on the server)
   - proof public inputs hash to the claimed venue hash

6. backend signs an EIP-712 `EventAuthorization` message:
   - includes: `organizer`, `venueHash`, `eventId`, `start`, `end`, `deadline`

7. organizer wallet calls:
   - `createEventWithSig(eventId, venueHash, start, end, sig)`

8. contract verifies:
   - EIP-712 signature recovers to `ipSigner` (the backend signer)
   - deadline has not passed
   - wallet is the event organizer

9. backend verifies the actual transaction on-chain and only then stores event metadata:
   - this prevents storing metadata for events that weren't actually created on-chain

Important nuance:

- the organizer proof is used as a **server-side gate** before signing the `EventAuthorization`
- it is not itself recorded on-chain
- that is mostly a good tradeoff: cheaper, simpler, enough for event-creation authorization
- the organizer being at the venue at creation time is an operational signal, not an on-chain fact

---

## 5. Attendee Flow

The attendee flow is implemented in:

- `packages/web/src/app/event/[eventId]/EventClient.tsx`

The flow is:

1. load event metadata from db through:
   - `/api/events/[eventId]`

2. connect wallet (MetaMask, Coinbase Wallet, or any injected provider)

3. verify humanity through World:
   - app calls `/api/world/rp-context` to get a relying-party context
   - World widget runs in-browser (biometric check on the user's World app / Orb-verified identity)
   - backend verifies the World result at `/api/world/verify` and issues a short-lived World token
   - the World token is a JWT signed by the backend, scoped to this wallet + event

4. call `/api/verify-ip`:
   - presents the World token
   - backend checks: World token valid, event exists, event is active, venue hash matches, request IP matches venue subnet prefix
   - backend signs an EIP-712 `IPVerification` message

5. browser gets GPS location from `navigator.geolocation`

6. browser generates the ZK proof locally using the loaded `circuit.json` and Barretenberg WASM

7. wallet calls `claimAttendance(eventId, proof, publicInputs, ipSig)`

8. contract re-checks:
   - event exists and is active
   - event ID public input matches the expected event
   - venue hash derived from public inputs matches the stored `venueHash`
   - ZK proof verifies on-chain via `Verifier.sol`
   - EIP-712 IP signature recovers to `ipSigner`
   - optional Coinbase KYC check if enabled

9. contract mints the EAS attendance attestation:
   - using `IEAS.attest(...)` with the configured schema
   - attestation data includes: wallet, eventId, timestamp

10. app archives claim metadata to Storacha (optional, post-claim)

This means the final claim is protected by multiple independent layers, not just one.

---

## 6. How the Wi-Fi / IP / Subnet Part Actually Works



### 6.1 Do 20 people on the same Wi-Fi have the same IP address?

Not exactly.

Usually there are two different IP concepts:

1. **private/local IP**
   - inside the local Wi-Fi network
   - examples:
     - `192.168.1.12`
     - `192.168.1.37`
     - `10.0.0.8`
   - each device on the network gets its own local IP via DHCP

2. **public IP**
   - what the wider internet sees
   - this is often shared by many devices behind the same router through NAT
   - all traffic from those devices appears to originate from one public IP

So if 20 people connect to the same venue Wi-Fi:

- they usually have different **private local IPs**
- they may share the same **public IP**

### 6.2 What is the subnet prefix?

A subnet prefix is the shared beginning of the local IP addresses that belong to a network.

Example:

- local device IP: `192.168.1.42`
- subnet prefix: `192.168.1.`

That prefix says:

> "This request appears to be coming from the expected local network range."

In the current implementation, the venue subnet check is a prefix match in:

- `packages/web/src/app/api/verify-ip/route.ts`

Specifically, it checks:

- `clientIp.startsWith(expectedSubnet)`

So if the organizer configured `192.168.1.` as the subnet prefix, then only requests from IPs starting with `192.168.1.` will get the signature.

### 6.3 What is request IP?

Request IP is the IP address the backend sees for the incoming HTTP request.

In this codebase, it is read in:

- `packages/web/src/lib/trusted-ip.ts`

 the code trusts:

- `x-vercel-forwarded-for` (set by Vercel's edge network, trusted because Vercel does not allow clients to spoof this header)

In dev, it can also use:

- `x-forwarded-for`
- `x-real-ip`

### 6.4 How is this related to Wi-Fi?

The product idea is:

> if you are physically at the venue and connected to the venue network, your request should come through the expected venue network path

In the current implementation, the backend uses the request IP as a proxy for venue network membership.


- it is not proving Wi-Fi membership inside the circuit
- it is an operational network-side check performed by the backend

So the venue network signal is:

- "the request appears to be coming from the venue's expected network range"

For this to work with local IPs at a venue, the app needs to be accessible over the local network (or the venue's internet path needs to route through a known IP range). For a typical event with enterprise Wi-Fi, the venue's network is behind a NAT with a known public IP, and the organizer would configure that known IP or prefix.

### 6.5 Is this the same as "the whole world can see your IP"?

Not exactly, but related.

Yes, websites generally learn the IP address your request comes from.

That is normal on the internet.

However:

- the browser does not necessarily expose your private home or venue LAN IP directly
- the backend often only sees the routed IP made visible through the network/proxy setup

So:

> "Is the app reading some secret IP from the browser?"



> No. The backend uses the IP it sees from the HTTP request path. That is standard web behavior.

### 6.6 Important deployment caveat

This is a very important honesty point.

The strength of the subnet check depends on deployment topology.

If the app is deployed behind a trusted proxy that preserves the right client IP information, the check is meaningful.

If the deployment setup hides the useful local network information and only exposes a general public NAT address, then the check is weaker or may not work the way you want.

so,

> "The current design uses a trusted request-IP network check as a venue-locality signal. Its exact strength depends on how the app is deployed behind the venue network and proxy stack."

For a beta event, the organizer would either: (a) set the subnet prefix to match the venue's known public IP/NAT prefix, or (b) run the app over the local network so private LAN IPs are what the backend sees.

---

## 7. Event Binding

Event binding means:

> the proof and signatures are tied to one specific event and venue configuration

This happens in multiple places:

1. the circuit public input includes `event_id` — so the proof is only valid for that specific event
2. the contract checks the public `event_id` against the claimed event on-chain
3. the contract hashes the public venue inputs and checks they match the registered `venueHash` — so you cannot change venue coordinates while reusing a valid proof
4. the EIP-712 `IPVerification` signature includes: `wallet`, `eventId`, `venueHash`, `deadline` — so the IP signature is not reusable for a different event, different wallet, or after the deadline

So you are binding:

- proof → event + venue boundary
- IP signature → wallet + event + venue + time window
- on-chain state → event record with specific venueHash

This is why a valid proof for Event A should not be reusable for Event B, and why a signature issued to wallet A cannot be used by wallet B.

---

## 8. EIP-712 and Why It Is Used

EIP-712 is the Ethereum standard for signing structured typed data.

Why not sign an arbitrary text string?

Because typed data is better for security and verification.

With a plain text string, the signer might accidentally sign something they did not intend to (replay attacks across different applications or chains).

With EIP-712, the signer signs a structured payload with explicit fields like:

- wallet
- eventId
- venueHash
- deadline

It also binds the signature to:

- chain ID (so a signature on Sepolia cannot be replayed on mainnet)
- verifying contract address (so a signature issued for contract A cannot be used at contract B)

This matters because it reduces ambiguity and makes on-chain verification straightforward.

In WiFiProof, the backend signs two main payload types:

1. `IPVerification` — issued by `/api/verify-ip` after checking the subnet
2. `EventAuthorization` — issued by `/api/events/authorize` after verifying the organizer proof

Those are built in:

- `packages/web/src/lib/signer.ts`

and verified on-chain in:

- `packages/contracts/src/WiFiProof.sol`

The on-chain check is simply:

- `ECDSA.recover(hashTypedData(domain, structHash), signature) == ipSigner`

The `ipSigner` address is set in the contract and corresponds to the PKP address managed by Lit.

---

## 9. Lit Protocol in This System

Lit is used here as a server-side signing backend.

The important concept is:

- WiFiProof needs a trusted signer for EIP-712 authorization messages
- instead of storing a normal raw private key on the (my)server, i can delegate that signing to Lit / PKP

Without Lit, i would store a `SIGNER_PRIVATE_KEY` in your environment and sign with `new ethers.Wallet(key)`. That works but puts the private key in your deployment environment. If someone gets your env vars, they can forge any signature.

With Lit (Chipotle mode), the private key lives inside a Lit PKP — a key pair managed by the Lit network's threshold key shares. No single node (and not you) ever has the raw private key.

### 9.1 How Lit Chipotle signing works step by step

Current code:

- `packages/web/src/lib/lit-signer.ts`

In Chipotle mode, the flow is:

1. server constructs the EIP-712 typed payload (domain + struct)
2. server hashes it with `hashTypedData(domain, types, value)` into a 32-byte digest
3. server sends the digest to Lit Chipotle API at `api.dev.litprotocol.com/core/v1`
4. Lit Action runs inside a trusted execution environment (TEE)
5. the Lit Action calls `Lit.Actions.getPrivateKey({ pkpId })` to retrieve the PKP signing key inside the TEE
6. the action constructs an `ethers.utils.SigningKey` from the retrieved key
7. it signs the digest with `signingKey.signDigest(digestBytes)` — deterministic ECDSA
8. the signature is returned as `{ r, s, v }`
9. server concatenates `r + s + v` into a standard 130-character hex signature
10. server locally recovers the signer from the signature and verifies it matches the expected PKP address

The contract does not know or care whether the signature came from:

- a raw server key
- a Lit PKP

It only cares that:

- `ECDSA.recover(signature)` equals `ipSigner`

### 9.2 Why `getPrivateKey` and not `signEcdsa`

Lit has two signing primitives:

- `Lit.Actions.signEcdsa(...)` — TEE-based signing using threshold ECDSA, non-deterministic (uses randomness from the network)
- `Lit.Actions.getPrivateKey({ pkpId })` — retrieves the raw key inside the TEE for you to sign with locally

The problem with `signEcdsa` in Chipotle is that it uses network-provided randomness, so the signature changes on every call even for the same digest. That makes server-side recovery checks unreliable.

Using `getPrivateKey` + `ethers.utils.SigningKey.signDigest()` is deterministic: same digest always produces the same signature. That is what we need for reliable recovery checks.

The key never leaves the TEE — you are not exposing it; you are just signing inside the trusted environment.

### 9.3 The `SIGNER_MODE` toggle

The codebase supports two modes:

- `SIGNER_MODE=key` — signs with a raw env var key (`SIGNER_PRIVATE_KEY`)
- `SIGNER_MODE=lit` — delegates to Lit Chipotle

In `packages/web/src/lib/signer.ts`, the dispatch is:

```
if (process.env.SIGNER_MODE === 'lit' && process.env.LIT_NETWORK === 'chipotle') {
  return litSign(digest, type)
} else {
  return localKeySign(digest)
}
```

This makes it easy to test locally with a raw key and deploy to production with the Lit-backed signer.

---

## 10. Why EAS Attestations Instead of NFTs

### 10.1 Why not an NFT?

An NFT is usually:

- transferable by default
- asset-like
- designed to be owned and moved

That is often the wrong mental model for attendance.

Attendance is not mainly:

- a collectible
- a tradable asset

It is a claim:

> "This wallet attended this event."

The problem with using an NFT:

- it can be transferred to a wallet that never attended
- the holder of the token is not necessarily the attendee
- people think of NFTs as collectibles and speculate on "POAP floors"
- attendance records lose meaning when they become tradable

### 10.2 Why EAS makes more sense

EAS (Ethereum Attestation Service) attestation is better aligned with the product semantics:

- it is a structured statement, not an asset
- it is schema-driven: you define exactly what fields the attestation contains
- it is naturally closer to "verifiable claim" than "tradable object"
- it fits the idea of identity/credibility/history better than a collectible token
- an EAS attestation for a wallet says something about that wallet's history; a transferable NFT does not

In WiFiProof, the contract ultimately mints an EAS attestation using the EAS SDK in:

- `packages/contracts/src/WiFiProof.sol`

That means the output of the system is:

- a verifiable attendance statement about a specific wallet

not:

- a generic token someone might transfer or farm as a collectible

### 10.3 What the attestation contains

The EAS attestation WiFiProof creates contains:

- the attester (the WiFiProof contract address)
- the recipient (the attendee wallet)
- the schema (defining the data fields)
- the data: eventId, venueHash, timestamp, and any other fields encoded per the schema

Anyone can look up an attestation on the EAS explorer (for Base Sepolia or Base mainnet) and verify that a specific wallet has a specific attestation from the WiFiProof contract.

---

## 11. Why Storacha Is Only For Archival

Storacha is not part of the proof validity path.

It is used after a successful claim to store a durable copy of the claim metadata.

That archival payload includes things like:

- eventId
- wallet
- txHash
- attestation UID
- proof hash
- public inputs hash

This is uploaded in:

- `packages/web/src/lib/storacha.ts`
- `packages/web/src/app/api/claims/archive/route.ts`

Why call it archival?

Because it is:

- evidence storage
- durable record-keeping on a decentralized content-addressed network (IPFS/Filecoin via Storacha)
- optional retrieval / audit trail

It is not what makes the claim valid.

The order matters:

1. claim succeeds on-chain (attestation minted)
2. archive route verifies the on-chain claim exists (fetches the transaction and attestation UID)
3. then it uploads the metadata snapshot to Storacha

So if Storacha disappeared tomorrow:

- new claims could still succeed on-chain
- the EAS attestations would still exist
- you would just lose that archival layer

Think of it as a structured audit log: "here is everything we know about this claim at the time it was made." Useful for debugging, analytics, or external verifiers who want more context beyond the on-chain attestation.

---

## 12. What Still Depends on Trust

### 12.1 The device/browser location source

The browser gets coordinates from:

- `navigator.geolocation`

That means the system is trusting the device/browser stack to supply a real location.

Can this be spoofed?

Yes. In Chrome DevTools you can override geolocation. There are also browser extensions and OS-level VPNs that report false locations.

This is why the system does not rely on GPS alone.

Instead, it combines GPS with:

- venue network check (you need to be on the network)
- event binding (the proof is tied to a specific event and venue hash)
- identity / uniqueness layer (World: hard to get multiple verified identities)
- on-chain verification (the contract independently verifies everything)


> "The proof is cryptographically strong for the values it receives, but the device location source itself is still a real-world trust assumption. That is why we stack it with network and identity checks."

### 12.2 The server signer and backend availability

The backend signs:

- IP authorizations
- organizer event authorizations

That means the system currently depends on:

- backend availability
- signer correctness

If the signer is down:

- claims and event creation that depend on fresh signatures will fail

If the signer is compromised:

- bad signatures could be issued (e.g., IP authorizations for people not on the venue network)

Mitigations in the design:

- short-lived deadlines on every signature (typically minutes, not hours)
- on-chain verification of recovered signer (contract checks `ECDSA.recover == ipSigner`)
- Lit-backed signing option (private key never in env vars)
- server-side signer recovery checks before returning a signature


### 12.3 The deployment topology for the IP/subnet check

The venue subnet logic only means something if the backend can trust the request IP it sees.

That depends on:

- reverse proxy behavior
- hosting platform headers
- whether the app is actually being reached through the venue network path

So the check is not purely mathematical. It is environmental.


> "The subnet check is an operational network control, not a pure cryptographic primitive. Its strength depends on how the app is deployed and routed."

### 12.4 World / identity layer behavior

If World verification is enabled, then WiFiProof is trusting:

- World's verification flow (World Orb biometric registration)
- your server-side validation of the World result (nullifier check)
- the semantics of the nullifier: the same human cannot generate two different World proofs scoped to the same app action

Similarly, if Coinbase verified-account checks are enabled in the contract, then you are trusting:

- Coinbase attestation issuance
- the correctness of the on-chain attestation indexer

This means the identity layer is not invented entirely inside WiFiProof.


> "The identity layer depends on the guarantees of the identity system we integrate with. WiFiProof verifies and binds that result, but it does not replace the external identity provider."

---

## 13. Exact Data Flow Summary

### Organizer side

1. organizer enters venue metadata
2. app derives `eventId` (keccak256 of name:start:end)
3. app computes `venueHash` (hash of scaled venue coordinates + threshold + eventId)
4. app gets geolocation
5. browser generates organizer ZK proof locally
6. backend at `/api/events/authorize` verifies proof, checks organizer allowlist, checks subnet
7. backend signs `EventAuthorization` EIP-712 message
8. wallet calls `createEventWithSig` on-chain
9. backend verifies the tx and stores event metadata in Supabase

### Attendee side

1. attendee opens event page
2. event metadata loads from Supabase via `/api/events/[eventId]`
3. attendee connects wallet
4. attendee completes World verification in-browser → backend issues short-lived World JWT
5. attendee calls `/api/verify-ip` with World token
6. backend checks subnet, verifies World token, signs `IPVerification` EIP-712 message
7. attendee browser gets geolocation
8. browser generates ZK proof locally (Barretenberg WASM)
9. wallet calls `claimAttendance(eventId, proof, publicInputs, ipSig)`
10. contract verifies proof, IP signature, event binding, optional KYC → mints EAS attestation
11. app archives claim metadata snapshot to Storacha

---

## 14. Questions People May Ask — Detailed Answers

### Q: Why not just use Wi-Fi?

The short answer is that Wi-Fi alone is only a network check. It tells you the device appears to be on the expected venue network. It does not privately prove the device was inside the venue boundary, and it does not tell you the user was a real, unique human.

If an event organizer set up a hotspot with the right SSID or someone knew the venue's network prefix, they could fake the network signal without being there. Combining Wi-Fi presence with a ZK proximity proof and identity verification creates a much stronger signal. You would have to simultaneously be on the network, be in the geolocation range, and pass a biometric-linked identity check.

The ZK part is also what gives attendees privacy. The Wi-Fi check alone would just tell the backend the user's IP. The ZK proof is what ensures the backend never learns the user's exact coordinates.

### Q: Why not just use geolocation?

Browser geolocation is easily spoofed. In Chrome DevTools → Sensors, you can set any coordinates you want. There are browser extensions that do the same. There are also VPN products that report false GPS positions.

So GPS alone is a weak signal under adversarial conditions.

WiFiProof adds the venue-network check (you have to be on the right network, not just reporting the right GPS coordinates), the event binding (the proof is only valid for this specific event), and the World identity check (you can only claim once per unique human identity). These layers make the combined signal much harder to fake.

The ZK part is still valuable even if GPS can be spoofed, because: (a) most users will not be actively spoofing, (b) spoofing is harder at scale, and (c) the cryptographic binding to the network and identity checks means that spoofing GPS still does not give you a claim unless you also bypass the other layers.

### Q: What exactly is private?

The attendee's exact GPS coordinates are never sent to the backend or put on-chain. The only things submitted to the contract are:

- the proof bytes (an opaque cryptographic blob)
- the public inputs: venue lat, venue lon, threshold_sq, event_id — all of which are the **venue's** parameters, not the user's location

The user's actual lat/lon exist only on-device as the private circuit inputs. The circuit witness (which includes those coordinates) is computed locally in the browser WASM and then discarded. Only the proof travels onward.

The backend does learn the user's request IP (needed for the subnet check). That is unavoidable in standard web architecture. But precise geolocation coordinates stay private.

### Q: What are the public inputs?

The circuit public inputs are the values that are revealed alongside the proof:

- `venue_lat` — the venue center latitude (scaled by 1e6)
- `venue_lon` — the venue center longitude (scaled by 1e6)
- `threshold_sq` — the squared radius threshold in scaled GPS units
- `event_id` — the unique event identifier

These are the venue's parameters, not the user's. Seeing the public inputs tells a verifier: "the proof was generated for this venue, this radius, this event." It reveals nothing about where exactly the user was, only that they were within the boundary.

### Q: What does the proof prove, exactly?

The proof proves:

> "I know a pair of coordinates (user_lat, user_lon) such that, when measured against the public venue center (venue_lat, venue_lon), the squared distance is less than threshold_sq, and these coordinates were generated in the context of event_id."

More precisely: the proof is a cryptographic assertion that there exists a valid witness (the private inputs and intermediate values) satisfying all the circuit constraints, without revealing that witness.

The prover cannot fake this. You cannot generate a valid proof with fake coordinates that satisfy the constraints unless you know coordinates that genuinely satisfy the constraints.


### Q: Is the venue Wi-Fi check perfect?

No. It is an operational network check based on request IP visibility and deployment topology, not a pure cryptographic proof of Wi-Fi association.

If someone has access to the venue's network from a remote location (e.g., VPN into the venue's corporate network), they could pass the subnet check without being physically there. The IP check is a meaningful practical barrier at small-to-medium events but is not unbreakable under a sufficiently sophisticated attacker.

The check is designed to be "good enough for events" rather than "unforgeable for adversarial environments." Combined with GPS proximity and identity, the stacked barrier is significantly harder to beat.

### Q: Why use EAS and not a POAP NFT?

POAPs are ERC-721 NFTs on a sidechain (the POAP network, now also on mainnet). They are fine for simple "I was here" collectibles, but they have some problems for a system like WiFiProof:

1. They are transferable. Someone who attends can sell or give the POAP to someone who did not attend.
2. They are collectible by design. People farm POAPs for "floor price" speculation, which distorts the attendance signal.
3. The fact of attending an event is not really an "asset" — it is a historical fact about a specific wallet's identity.

EAS attestations model this better because:
- attestations are tied to a recipient wallet and a schema
- the attester (the WiFiProof contract) signs the attestation, so it is not self-issued
- the schema fields can include proof metadata, timestamps, event details
- attestations are lookupable on EAS Explorer and verifiable by anyone

If a future application wants to check "did wallet X attend event Y?", it can query EAS directly and get a cryptographically attested answer, without caring about NFT ownership.

### Q: Why not verify the organizer proof on-chain too?

Because the organizer proof is being used as an authorization gate before event creation, not as a public claim about the organizer.

The full verification path for organizer proof submission would be:

1. submit proof on-chain at creation time
2. pay gas for on-chain UltraHonk proof verification (which is not cheap)
3. gain what exactly? — a record that the organizer was at the venue when they created the event

That tradeoff is not obviously worth it in the current product:

- event creation is gated by backend verification of the proof anyway
- the organizer is already allowlisted (an off-chain trust relationship)
- on-chain verification would just add cost without meaningfully changing the trust model

****** If the product evolved to be fully permissionless (anyone can create an event, no backend allowlist), then on-chain organizer proof verification would become more important.

### Q: What if Storacha fails?

The attendance claim can still succeed. Storacha is archival, not part of the verification path.

If the `/api/claims/archive` call fails after a successful on-chain claim, the user still has a valid EAS attestation. The claim happened. The Storacha archive is a secondary record for audit purposes.

If Storacha is unavailable entirely, the app would just log the failure and move on. The UX would be a minor degradation (no downloadable archive link), not a claim failure.

### Q: What if Lit fails?

Then fresh IP authorizations and event authorization signatures will fail until the Lit path is restored.

More specifically:

- Lit Chipotle is a managed API at `api.dev.litprotocol.com/core/v1`
- if that API is down, `lit-signer.ts` throws an error
- `verify-ip/route.ts` returns an error to the client
- the attendee flow is blocked at the IP verification step

The contract itself still enforces signature validity for whatever signatures are submitted. Lit going down does not compromise existing claims — it just prevents new signatures from being issued.

Mitigation: the `SIGNER_MODE=key` fallback can be used if Lit is unavailable. In that mode, a local env var key is used instead. That is less ideal from a security standpoint but would keep the system running.

### Q: What are the main trust assumptions?

There are four main trust anchors:

1. **Device geolocation honesty.** The ZK proof is only as good as the coordinates the browser reports. Spoofing GPS defeats the proximity check.

2. **Server signer correctness and availability.** The backend signer issues the EIP-712 authorizations that the contract checks. If the signer is compromised, fake authorizations could be issued.

3. **Deployment/network topology for the IP check.** The subnet check is an operational network control. Its strength depends on how the app is deployed and how the reverse proxy preserves IP information.

4. **External identity provider behavior.** If World verification is enabled, WiFiProof depends on World's Orb-backed biometric uniqueness guarantee. If Coinbase KYC is enabled, it depends on Coinbase's attestation issuance.

Each of these is knowable and documented. None of them are hidden. The system is designed so that an attacker has to simultaneously defeat all four layers, not just one.

### Q: Is the proof reusable across events?

No. The event ID is part of the circuit's public inputs. The circuit proves proximity *for this specific event_id*. The contract independently checks that the event_id public input matches the on-chain event.

If you tried to submit a proof from Event A to claim attendance at Event B, the contract would reject it: the event_id in the proof's public inputs would not match Event B's ID.

Additionally, the EIP-712 IP signature includes the eventId as a field. So the signature issued for Event A also cannot be used for Event B.

### Q: Why hash the public inputs into a venue hash?

The contract stores a single `venueHash` per event. This hash commits to:

- the scaled venue latitude
- the scaled venue longitude
- the threshold_sq value
- the event_id

When an attendee submits a claim, the contract recomputes this hash from the proof's public inputs and checks it matches the stored venueHash.

This means: you cannot submit a proof with slightly different venue coordinates or a more generous radius and have it accepted. The venue configuration is locked in at event creation time. Any proof submitted for this event must use exactly those parameters.

Without the venue hash, an attacker could potentially generate a proof with a very large `threshold_sq` (covering the whole city) and claim attendance from anywhere. The venue hash prevents that.

### Q: What happens if I attend two events on the same day at the same venue?

Each event has a distinct `event_id` (derived from `keccak256(name:start:end)`). Even if two events are at the same venue, if they have different names or time windows, they will have different event IDs, different venue hashes, and different EIP-712 signatures.

You can generate proofs for both and claim both. The contract tracks claims per wallet per eventId, so double-claiming the same event is blocked, but attending two separate events is fine.

### Q: How long does browser proving take?

Barretenberg UltraHonk proving in the browser (via WASM) typically takes 3–10 seconds on a modern laptop or recent smartphone. The first run may be slower due to WASM initialization and `circuit.json` loading. Subsequent proves in the same session are faster.

This is a known tradeoff with in-browser ZK proving. It is acceptable for a "claim your attendance" flow where the user is not expected to do this more than once per event.

### Q: Why not prove on-chain instead of in the browser?

On-chain proving does not exist in the same way. The ZK proof is generated off-chain (here, in-browser) and then verified on-chain. The contract runs the *verifier*, not the prover.

Proving is computationally expensive (it takes seconds even in WASM). Verification is much cheaper (it is a fixed-cost operation that a smart contract can afford to run). That is the standard ZK architecture: prove locally, verify on-chain.

The privacy benefit of in-browser proving is that the raw private inputs (user coordinates) stay on the device. If proving were done server-side, the server would need to receive the coordinates to compute the proof, which would defeat the privacy goal.
