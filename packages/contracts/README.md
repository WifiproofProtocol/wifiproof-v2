# @wifiproof/contracts

Smart contracts for WiFiProof V2 on Base.

## Overview

This package contains Foundry smart contracts for:
1. **UltraVerifier.sol** - Auto-generated ZK verifier from Noir circuit
2. **WiFiProof.sol** - Main contract for minting attendance attestations

## Setup

```bash
# Initialize Foundry project (run from this directory)
forge init --no-commit

# Install EAS contracts dependency
forge install ethereum-attestation-service/eas-contracts --no-commit

# This will create:
# - foundry.toml
# - src/
# - script/
# - test/
# - lib/
```

## Structure (After Initialization)

```
contracts/
├── foundry.toml        # Foundry config
├── src/
│   ├── WiFiProof.sol   # Main minting contract
│   └── UltraVerifier.sol # Generated from Noir (copy from circuits)
├── script/
│   └── Deploy.s.sol    # Deployment script
├── test/
│   └── WiFiProof.t.sol # Contract tests
└── lib/                # Dependencies (EAS contracts)
```

## Key Addresses (Base)

| Contract | Mainnet | Sepolia |
|----------|---------|---------|
| EAS | `0x4200000000000000000000000000000000000021` | Same |
| Schema Registry | `0x4200000000000000000000000000000000000020` | Same |
| Coinbase Attester | `0x357458739F90461b99789350868CD7CF330Dd7EE` | `0xB5644397a9733f86Cacd928478B29b4cD6041C45` |
| Coinbase Indexer | `0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C` | `0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B` |

## Coinbase KYC Schema

```
Schema ID (Mainnet): 0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9
```

## Commands

```bash
# Build contracts
forge build

# Run tests
forge test -vvv

# Run tests with gas report
forge test --gas-report

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify

# Deploy to mainnet
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

## Environment Variables

Create `.env` in this directory:

```env
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org
BASESCAN_API_KEY=...
```
