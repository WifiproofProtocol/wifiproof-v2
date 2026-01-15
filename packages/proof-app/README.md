# @wifiproof/proof-app

Zero-Knowledge geolocation proof generation for WiFiProof V2.

## Overview

This package contains:
1. **Noir Circuit** - ZK circuit proving user is within radius of venue
2. **TypeScript Library** - Browser-side proof generation using NoirJS + Barretenberg

## Structure

```
proof-app/
├── circuit/                # Noir circuit
│   ├── Nargo.toml         # Noir project config
│   └── src/
│       └── main.nr        # Geolocation prover circuit
│
├── src/                   # TypeScript proving library
│   ├── index.ts          # Main exports
│   ├── prover.ts         # Proof generation logic
│   ├── types.ts          # Type definitions
│   └── utils/
│       └── gps.ts        # GPS coordinate scaling
│
├── package.json
└── README.md
```

## Circuit Logic

Proves: "I am within R meters of venue coordinates without revealing my exact location"

```
Distance² = (user_lat - venue_lat)² + (user_lon - venue_lon)²
Constraint: Distance² < Threshold²
```

### Inputs

| Input | Visibility | Description |
|-------|------------|-------------|
| `user_lat` | Private | User's latitude (scaled by 10^6) |
| `user_lon` | Private | User's longitude (scaled by 10^6) |
| `venue_lat` | Public | Venue latitude (scaled by 10^6) |
| `venue_lon` | Public | Venue longitude (scaled by 10^6) |
| `threshold_sq` | Public | Squared distance threshold |

## Development

### Compile Circuit

```bash
cd circuit
nargo compile
```

### Run Circuit Tests

```bash
cd circuit
nargo test
```

### Generate Proof (CLI)

```bash
cd circuit
nargo execute witness_name
bb prove -b ./target/circuit.json -w ./target/witness_name.gz -o ./target
```

## Browser Usage

```typescript
import { generateGeolocationProof, verifyProof } from '@wifiproof/proof-app';

// User's private location
const userLocation = { latitude: 37.7750, longitude: -122.4195 };

// Venue's public location
const venueLocation = { latitude: 37.7749, longitude: -122.4194 };

// Generate proof (user is within 100m of venue)
const { proof, publicInputs } = await generateGeolocationProof({
  userLocation,
  venueLocation,
  radiusMeters: 100,
});

// Verify proof
const isValid = await verifyProof(proof, publicInputs);
```

## Dependencies

- `@noir-lang/noir_js@1.0.0-beta.18` - Circuit execution
- `@aztec/bb.js@0.87.0` - Barretenberg proving backend

## GPS Coordinate Scaling

GPS coordinates are scaled by 10^6 for circuit compatibility:

| Original | Scaled |
|----------|--------|
| 37.7749° | 37774900 |
| -122.4194° | -122419400 |
