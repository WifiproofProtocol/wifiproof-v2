import { NextResponse } from "next/server";

import { verifyEventMetadataToken } from "@/lib/event-metadata-token";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  computeVenueHashFromMetadata,
  verifyEventCreationTransaction,
} from "@/lib/wifiproof-chain";

type CreateEventBody = {
  organizer: string;
  eventId: string;
  venueHash: string;
  subnetPrefix: string;
  startTime: number;
  endTime: number;
  venueName: string;
  venueLat: number;
  venueLon: number;
  radiusMeters: number;
  txHash: string;
  metadataToken: string;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateEventBody;
    const {
      organizer,
      eventId,
      venueHash,
      subnetPrefix,
      startTime,
      endTime,
      venueName,
      venueLat,
      venueLon,
      radiusMeters,
      txHash,
      metadataToken,
    } = body;

    const normalizedOrganizer =
      typeof organizer === "string" ? normalize(organizer) : "";
    const normalizedEventId =
      typeof eventId === "string" ? normalize(eventId) : "";
    const normalizedVenueHash =
      typeof venueHash === "string" ? normalize(venueHash) : "";
    const normalizedTxHash = typeof txHash === "string" ? normalize(txHash) : "";
    const normalizedVenueName = typeof venueName === "string" ? venueName.trim() : "";
    const normalizedSubnetPrefix =
      typeof subnetPrefix === "string" ? subnetPrefix.trim() : "";

    if (
      !ADDRESS_RE.test(normalizedOrganizer) ||
      !BYTES32_RE.test(normalizedEventId) ||
      !BYTES32_RE.test(normalizedVenueHash) ||
      !BYTES32_RE.test(normalizedTxHash) ||
      !metadataToken ||
      !normalizedSubnetPrefix ||
      !Number.isInteger(startTime) ||
      !Number.isInteger(endTime) ||
      !normalizedVenueName ||
      !Number.isFinite(venueLat) ||
      !Number.isFinite(venueLon) ||
      !Number.isFinite(radiusMeters)
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const metadataClaims = verifyEventMetadataToken(metadataToken);
    if (!metadataClaims) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      metadataClaims.organizer !== normalizedOrganizer ||
      metadataClaims.eventId !== normalizedEventId ||
      metadataClaims.venueHash !== normalizedVenueHash ||
      metadataClaims.startTime !== startTime ||
      metadataClaims.endTime !== endTime ||
      metadataClaims.venueName !== normalizedVenueName ||
      metadataClaims.subnetPrefix !== normalizedSubnetPrefix
    ) {
      return NextResponse.json({ error: "Metadata token mismatch" }, { status: 403 });
    }

    const computedVenueHash = await computeVenueHashFromMetadata({
      eventId: normalizedEventId as `0x${string}`,
      venueLat,
      venueLon,
      radiusMeters,
    });

    if (normalize(computedVenueHash) !== normalizedVenueHash) {
      return NextResponse.json({ error: "Venue metadata mismatch" }, { status: 403 });
    }

    try {
      await verifyEventCreationTransaction({
        txHash: normalizedTxHash as `0x${string}`,
        organizer: normalizedOrganizer as `0x${string}`,
        eventId: normalizedEventId as `0x${string}`,
        venueHash: normalizedVenueHash as `0x${string}`,
        startTime,
        endTime,
        venueName: normalizedVenueName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Event creation verification failed";
      return NextResponse.json(
        { error: "Event creation verification failed", detail: message },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const eventRow = {
      event_id: normalizedEventId,
      venue_hash: normalizedVenueHash,
      subnet_prefix: normalizedSubnetPrefix,
      start_time: startTime,
      end_time: endTime,
      venue_name: normalizedVenueName,
      venue_lat: venueLat,
      venue_lon: venueLon,
      radius_meters: radiusMeters,
    };

    const { data: existing, error: lookupError } = await supabase
      .from("events")
      .select(
        "event_id, venue_hash, subnet_prefix, start_time, end_time, venue_name, venue_lat, venue_lon, radius_meters"
      )
      .eq("event_id", normalizedEventId)
      .maybeSingle();

    if (lookupError) {
      console.error("[events/create] Supabase lookup error:", lookupError);
      return NextResponse.json(
        { error: "Failed to check event", detail: lookupError.message },
        { status: 500 }
      );
    }

    if (existing) {
      const matchesExisting =
        existing.event_id === eventRow.event_id &&
        existing.venue_hash === eventRow.venue_hash &&
        existing.subnet_prefix === eventRow.subnet_prefix &&
        Number(existing.start_time) === eventRow.start_time &&
        Number(existing.end_time) === eventRow.end_time &&
        (existing.venue_name ?? "") === eventRow.venue_name &&
        Number(existing.venue_lat) === eventRow.venue_lat &&
        Number(existing.venue_lon) === eventRow.venue_lon &&
        Number(existing.radius_meters) === eventRow.radius_meters;

      if (!matchesExisting) {
        return NextResponse.json(
          { error: "Event metadata already exists with different values" },
          { status: 409 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from("events").insert(eventRow);

    if (error) {
      console.error("[events/create] Supabase upsert error:", error);
      return NextResponse.json({ error: "Failed to save event", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
