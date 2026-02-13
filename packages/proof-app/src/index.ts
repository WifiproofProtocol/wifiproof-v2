import { Noir, CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend, ProofData } from '@aztec/bb.js';

// GPS coordinate scaling factor (10^6 for 6 decimal places)
export const GPS_SCALE = 1_000_000;

// bn254 scalar field modulus (r) for negative number conversion
// Noir's Field type operates within this finite field
// Negative numbers are represented as: n mod r (i.e., r + n for negative n)
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export interface CircuitInputs {
  user_lat: string;
  user_lon: string;
  venue_lat: string;
  venue_lon: string;
  threshold_sq: string;
  event_id: string;
}

export interface GPSCoordinate {
  lat: number;
  lon: number;
}

export type EventIdInput = string | bigint;

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
}

// Scale GPS coordinate to circuit-compatible field element
// Negative coordinates are converted to their field representation (r + n)
export function scaleGPS(coord: number): string {
  const scaled = Math.round(coord * GPS_SCALE);
  if (scaled < 0) {
    return (FIELD_MODULUS + BigInt(scaled)).toString();
  }
  return scaled.toString();
}

// Calculate threshold_sq from radius in meters
// At equator: 1 degree ≈ 111,320 meters
// threshold_sq = (radius_scaled)^2 where radius_scaled = radius_m * GPS_SCALE / 111320
export function calculateThresholdSq(radiusMeters: number): string {
  const metersPerDegree = 111_320;
  const radiusScaled = (radiusMeters * GPS_SCALE) / metersPerDegree;
  return Math.round(radiusScaled * radiusScaled).toString();
}

// Convert eventId (bytes32 hex or bigint) into BN254 field element
export function eventIdToField(eventId: EventIdInput): string {
  const value = typeof eventId === 'string' ? BigInt(eventId) : eventId;
  const modded = value % FIELD_MODULUS;
  return modded.toString();
}

// Build circuit inputs from GPS coordinates
export function buildInputs(
  userLocation: GPSCoordinate,
  venueLocation: GPSCoordinate,
  radiusMeters: number,
  eventId: EventIdInput
): CircuitInputs {
  return {
    user_lat: scaleGPS(userLocation.lat),
    user_lon: scaleGPS(userLocation.lon),
    venue_lat: scaleGPS(venueLocation.lat),
    venue_lon: scaleGPS(venueLocation.lon),
    threshold_sq: calculateThresholdSq(radiusMeters),
    event_id: eventIdToField(eventId),
  };
}

export class WiFiProofProver {
  private noir: Noir | null = null;
  private backend: UltraHonkBackend | null = null;
  private api: Barretenberg | null = null;

  async init(circuit: CompiledCircuit): Promise<void> {
    this.noir = new Noir(circuit);
    this.api = await Barretenberg.new({ threads: 1 });
    this.backend = new UltraHonkBackend(circuit.bytecode, this.api);
  }

  async generateProof(inputs: CircuitInputs): Promise<ProofResult> {
    if (!this.noir || !this.backend) {
      throw new Error('Prover not initialized. Call init() first.');
    }

    const { witness } = await this.noir.execute(inputs as unknown as InputMap);
    const proof = await this.backend.generateProof(witness, { verifierTarget: 'evm' });

    return {
      proof: proof.proof,
      publicInputs: proof.publicInputs,
    };
  }

  async verifyProof(proofData: ProofData): Promise<boolean> {
    if (!this.backend) {
      throw new Error('Prover not initialized. Call init() first.');
    }

    return this.backend.verifyProof(proofData, { verifierTarget: 'evm' });
  }

  async destroy(): Promise<void> {
    if (this.api) {
      await this.api.destroy();
    }
    this.api = null;
    this.backend = null;
    this.noir = null;
  }
}

export type { CompiledCircuit, ProofData };
