import { Noir, CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend, ProofData } from '@aztec/bb.js';

// GPS coordinate scaling factor (10^6 for 6 decimal places)
export const GPS_SCALE = 1_000_000;

// bn254 scalar field modulus (r), used to reduce event identifiers.
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export interface CircuitInputs {
  user_lat: string;
  user_lon: string;
  event_witness: string;
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

// Scale GPS coordinate to the circuit's signed six-decimal fixed-point integer.
export function scaleGPS(coord: number): string {
  if (!Number.isFinite(coord)) {
    throw new Error('GPS coordinate must be a finite number.');
  }
  const scaled = Math.round(coord * GPS_SCALE);
  return scaled.toString();
}

// Calculate threshold_sq from radius in meters
// At equator: 1 degree ≈ 111,320 meters
// threshold_sq = (radius_scaled)^2 where radius_scaled = radius_m * GPS_SCALE / 111320
export function calculateThresholdSq(radiusMeters: number): string {
  if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) {
    throw new Error('Radius must be a positive whole number of meters.');
  }
  // Must match Solidity integer division: (radius * 1e6) / 111320, then square
  const metersPerDegree = 111_320n;
  const radiusScaled = (BigInt(radiusMeters) * BigInt(GPS_SCALE)) / metersPerDegree;
  return (radiusScaled * radiusScaled).toString();
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
  if (userLocation.lat < -90 || userLocation.lat > 90 || venueLocation.lat < -90 || venueLocation.lat > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees.');
  }
  if (userLocation.lon < -180 || userLocation.lon > 180 || venueLocation.lon < -180 || venueLocation.lon > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees.');
  }

  const boundEventId = eventIdToField(eventId);
  return {
    user_lat: scaleGPS(userLocation.lat),
    user_lon: scaleGPS(userLocation.lon),
    venue_lat: scaleGPS(venueLocation.lat),
    venue_lon: scaleGPS(venueLocation.lon),
    threshold_sq: calculateThresholdSq(radiusMeters),
    event_witness: boundEventId,
    event_id: boundEventId,
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
