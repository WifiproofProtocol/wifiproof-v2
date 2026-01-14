# WiFiProof V2

**The end of fake attendance. Context-aware, soulbound proofs of physical presence.**

WiFiProof is a Zero-Knowledge proof-of-attendance protocol that uses contextual constraints to cryptographically verify physical presence at events.

## Three-Layer Verification

| Layer | Purpose | Technology |
|-------|---------|------------|
| **ZK Geolocation** | Proves user is within radius R of venue | Noir circuits (Euclidean distance) |
| **WiFi Verification** | Proves connection to venue network | Server-signed IP verification |
| **Coinbase KYC** | Sybil resistance (one human = one proof) | EAS attestations |

## Project Structure

```
wifiproof-v2/
├── packages/
│   ├── circuits/       # Noir ZK circuits (nargo)
│   ├── contracts/      # Foundry smart contracts
│   ├── web/            # Next.js 14 frontend
│   └── common/         # Shared types & constants
│
├── package.json        # Root workspace config
├── pnpm-workspace.yaml # pnpm workspaces
├── context_v2.md       # Complete technical specification
└── README.md
```

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Circuits** | Noir (Barretenberg UltraPlonk) | v0.30.0+ |
| **Contracts** | Foundry (Solidity) | 0.8.24 |
| **Frontend** | Next.js, TypeScript, Tailwind | 14.x |
| **Wallet** | wagmi, viem | 2.x |
| **Database** | Supabase (PostgreSQL) | - |
| **Chain** | Base | Mainnet & Sepolia |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/WifiproofProtocol/wifiproof-v2.git
cd wifiproof-v2
pnpm install
```

### 2. Initialize Packages

```bash
# Noir circuits
cd packages/circuits
nargo init --name wifiproof

# Foundry contracts
cd ../contracts
forge init --no-commit
forge install ethereum-attestation-service/eas-contracts --no-commit

# Next.js web app
cd ../web
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 3. Development

```bash
# From root directory
pnpm dev                    # Run web app
pnpm circuits:compile       # Compile Noir circuits
pnpm contracts:test         # Run Foundry tests
```

## Package Details

| Package | Description | Docs |
|---------|-------------|------|
| `@wifiproof/circuits` | ZK geolocation prover | [README](./packages/circuits/README.md) |
| `@wifiproof/contracts` | EAS attestation minting | [README](./packages/contracts/README.md) |
| `@wifiproof/web` | User-facing application | [README](./packages/web/README.md) |
| `@wifiproof/common` | Shared types & utilities | [README](./packages/common/README.md) |

## Documentation

See [context_v2.md](./context_v2.md) for complete technical specification including:
- V1 learnings and limitations
- Architectural decisions & rationale
- Code quality standards
- Database schema
- API implementation
- Deployment strategy

## License

MIT
