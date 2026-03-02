/**
 * insert-event.ts
 *
 * Admin script to insert or update a WiFiProof event in Supabase.
 * Computes the venue hash using the same BN254 field logic as the contract.
 *
 * Usage:
 *   npx tsx scripts/insert-event.ts \
 *     --event-id 0xabc123... \
 *     --lat 37.7749 \
 *     --lon -122.4194 \
 *     --radius 50 \
 *     --subnet 192.168.1 \
 *     --start 2026-06-01T10:00:00Z \
 *     --end   2026-06-01T18:00:00Z \
 *     --name "ETHGlobal SF"
 *
 * Required env vars (in .env.local or set in shell):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { keccak256 } from "viem";
import {
  computeVenueHashFromScaled,
  scaleGPS,
  calculateThresholdSq,
  eventIdToField,
  encodeVenueHashInput,
} from "@wifiproof/common";

// ---------------------------------------------------------------------------
// Arg parsing (minimal, no external deps)
// ---------------------------------------------------------------------------

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function requireArg(flag: string): string {
  const v = arg(flag);
  if (!v) {
    console.error(`Missing required argument: ${flag}`);
    process.exit(1);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const eventId    = requireArg("--event-id");
  const lat        = parseFloat(requireArg("--lat"));
  const lon        = parseFloat(requireArg("--lon"));
  const radius     = parseFloat(requireArg("--radius"));
  const subnet     = requireArg("--subnet");
  const startStr   = requireArg("--start");
  const endStr     = requireArg("--end");
  const venueName  = arg("--name") ?? "";

  const startTime  = Math.floor(new Date(startStr).getTime() / 1000);
  const endTime    = Math.floor(new Date(endStr).getTime() / 1000);

  if (isNaN(startTime) || isNaN(endTime)) {
    console.error("Invalid --start or --end date (use ISO 8601 format)");
    process.exit(1);
  }

  // Compute venue hash using same encoding as contract
  const venueLatField   = scaleGPS(lat);
  const venueLonField   = scaleGPS(lon);
  const thresholdSqField = calculateThresholdSq(radius);
  const eventIdField    = eventIdToField(eventId);

  const encoded = encodeVenueHashInput(
    venueLatField,
    venueLonField,
    thresholdSqField,
    eventIdField
  );
  const venueHash = keccak256(encoded).toLowerCase();
  const eventIdNorm = eventId.toLowerCase();

  console.log("\nEvent details:");
  console.log("  event_id:      ", eventIdNorm);
  console.log("  venue_hash:    ", venueHash);
  console.log("  subnet_prefix: ", subnet);
  console.log("  start_time:    ", startTime, `(${startStr})`);
  console.log("  end_time:      ", endTime, `(${endStr})`);
  console.log("  venue_name:    ", venueName);
  console.log("  lat/lon:       ", lat, lon, `radius ${radius}m`);

  // ---------------------------------------------------------------------------
  // Supabase upsert
  // ---------------------------------------------------------------------------

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("\nMissing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("events").upsert(
    {
      event_id:      eventIdNorm,
      venue_hash:    venueHash,
      subnet_prefix: subnet,
      start_time:    startTime,
      end_time:      endTime,
      venue_name:    venueName,
    },
    { onConflict: "event_id" }
  );

  if (error) {
    console.error("\nSupabase upsert failed:", error.message);
    process.exit(1);
  }

  console.log("\nEvent upserted successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
