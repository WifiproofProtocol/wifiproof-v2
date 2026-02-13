export const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const GPS_SCALE = 1_000_000;
export const METERS_PER_DEGREE = 111_320;

export type EventIdInput = string | bigint;
export type Keccak256Fn = (data: Uint8Array) => `0x${string}` | string;

export function toField(value: bigint): bigint {
  const mod = value % FIELD_MODULUS;
  return mod >= 0n ? mod : mod + FIELD_MODULUS;
}

export function scaleGPS(coord: number): bigint {
  const scaled = BigInt(Math.round(coord * GPS_SCALE));
  return toField(scaled);
}

export function calculateThresholdSq(radiusMeters: number): bigint {
  const radiusScaled = (radiusMeters * GPS_SCALE) / METERS_PER_DEGREE;
  const thresholdSq = Math.round(radiusScaled * radiusScaled);
  return toField(BigInt(thresholdSq));
}

export function eventIdToField(eventId: EventIdInput): bigint {
  const value = typeof eventId === "string" ? BigInt(eventId) : eventId;
  return toField(value);
}

export function encodeVenueHashInput(
  venueLatField: bigint,
  venueLonField: bigint,
  thresholdSqField: bigint,
  eventIdField: bigint
): Uint8Array {
  return concatBytes([
    encodeUint256(venueLatField),
    encodeUint256(venueLonField),
    encodeUint256(thresholdSqField),
    encodeUint256(eventIdField),
  ]);
}

export function computeVenueHash(
  venueLatField: bigint,
  venueLonField: bigint,
  thresholdSqField: bigint,
  eventId: EventIdInput,
  keccak256: Keccak256Fn
): `0x${string}` | string {
  const eventIdField = eventIdToField(eventId);
  const encoded = encodeVenueHashInput(
    venueLatField,
    venueLonField,
    thresholdSqField,
    eventIdField
  );
  return keccak256(encoded);
}

export function computeVenueHashFromScaled(
  venueLatScaled: number,
  venueLonScaled: number,
  radiusMeters: number,
  eventId: EventIdInput,
  keccak256: Keccak256Fn
): `0x${string}` | string {
  const venueLatField = scaleGPS(venueLatScaled);
  const venueLonField = scaleGPS(venueLonScaled);
  const thresholdSqField = calculateThresholdSq(radiusMeters);
  return computeVenueHash(
    venueLatField,
    venueLonField,
    thresholdSqField,
    eventId,
    keccak256
  );
}

function encodeUint256(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i -= 1) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
