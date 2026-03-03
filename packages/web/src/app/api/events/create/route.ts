import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CreateEventBody = {
  eventId: string;
  venueHash: string;
  subnetPrefix: string;
  startTime: number;
  endTime: number;
  venueName: string;
  venueLat: number;
  venueLon: number;
  radiusMeters: number;
};

export async function POST(request: Request) {
  try {
    const adminToken = process.env.EVENT_ADMIN_TOKEN;
    if (adminToken) {
      const provided = request.headers.get("x-admin-token");
      if (!provided || provided !== adminToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await request.json()) as CreateEventBody;
    const {
      eventId,
      venueHash,
      subnetPrefix,
      startTime,
      endTime,
      venueName,
      venueLat,
      venueLon,
      radiusMeters,
    } = body;

    if (
      !eventId ||
      !venueHash ||
      !subnetPrefix ||
      !startTime ||
      !endTime ||
      !venueName ||
      venueLat === undefined ||
      venueLon === undefined ||
      radiusMeters === undefined
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("events").upsert({
      event_id: eventId.toLowerCase(),
      venue_hash: venueHash.toLowerCase(),
      subnet_prefix: subnetPrefix,
      start_time: startTime,
      end_time: endTime,
      venue_name: venueName,
      venue_lat: venueLat,
      venue_lon: venueLon,
      radius_meters: radiusMeters,
    });

    if (error) {
      console.error("[events/create] Supabase upsert error:", error);
      return NextResponse.json({ error: "Failed to save event", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
