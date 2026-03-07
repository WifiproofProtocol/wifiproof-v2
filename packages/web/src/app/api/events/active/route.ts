import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type EventRow = {
  event_id: string;
  start_time: number;
  end_time: number;
  venue_name: string;
};

export const dynamic = "force-dynamic";

function getUtcDayRange(dateParam: string | null) {
  if (!dateParam) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      start: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
    };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = Date.UTC(year, month - 1, day) / 1000;
  if (!Number.isFinite(start)) {
    return null;
  }

  return { date: dateParam, start };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dayRange = getUtcDayRange(url.searchParams.get("date"));
    if (!dayRange) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const dayStart = dayRange.start;
    const dayEnd = dayStart + 86_399;
    const now = Math.floor(Date.now() / 1000);

    const supabase = getSupabaseAdmin();

    const [liveResult, todayResult] = await Promise.all([
      supabase
        .from("events")
        .select("event_id, start_time, end_time, venue_name")
        .lte("start_time", now)
        .gte("end_time", now)
        .order("start_time", { ascending: true }),
      supabase
        .from("events")
        .select("event_id, start_time, end_time, venue_name")
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time", { ascending: true }),
    ]);

    if (liveResult.error || todayResult.error) {
      return NextResponse.json({ error: "Event lookup failed" }, { status: 500 });
    }

    const liveEvents = (liveResult.data ?? []) as EventRow[];
    const todayEvents = (todayResult.data ?? []) as EventRow[];
    const upcomingEvents = todayEvents.filter((event) => event.start_time > now);

    return NextResponse.json({
      now,
      date: dayRange.date,
      liveEvents,
      upcomingEvents,
      todayEvents,
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
