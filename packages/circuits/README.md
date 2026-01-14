# @wifiproof/circuits

Zero-Knowledge circuits for WiFiProof geolocation verification.

## Overview

This package contains Noir circuits that prove a user is within a specified radius of venue coordinates **without revealing their exact GPS location**.

## Circuit Logic

```
Distance² = (user_lat - venue_lat)² + (user_lon - venue_lon)²
Constraint: Distance² < Radius²
```

Uses Euclidean approximation (valid for <1km distances where Earth's curvature is negligible).

## Setup

```bash
# Initialize Noir project (run from this directory)
nargo init --name wifiproof

# This will create:
# - Nargo.toml
# - src/main.nr
```

## Structure (After Initialization)

```
circuits/
├── Nargo.toml          # Noir project config
├── src/
│   └── main.nr         # Main circuit (geolocation prover)
├── tests/
│   └── main.test.nr    # Circuit tests
└── README.md
```

## Commands

```bash
# Check circuit syntax
nargo check

# Compile circuit
nargo compile

# Generate proof (requires Prover.toml with inputs)
nargo prove

# Verify proof
nargo verify

# Generate Solidity verifier
nargo codegen-verifier
```

## GPS Coordinate Scaling

Noir circuits work with Field elements (integers only). GPS coordinates are scaled by 10^6:

| Original | Scaled |
|----------|--------|
| 37.7749° | 37774900 |
| -122.4194° | -122419400 |

## Public Inputs

| Input | Type | Description |
|-------|------|-------------|
| `venue_lat` | Field | Venue latitude (scaled) |
| `venue_lon` | Field | Venue longitude (scaled) |
| `threshold_sq` | Field | Squared distance threshold |

## Private Inputs

| Input | Type | Description |
|-------|------|-------------|
| `user_lat` | Field | User's latitude (scaled) - SECRET |
| `user_lon` | Field | User's longitude (scaled) - SECRET |
