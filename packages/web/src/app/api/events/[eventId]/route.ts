import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId?.toLowerCase();
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("events")
      .select(
        "event_id, venue_hash, subnet_prefix, start_time, end_time, venue_name, venue_lat, venue_lon, radius_meters"
      )
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Event lookup failed" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
