import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type EventRow = {
  event_id: string;
  venue_name: string | null;
  event_description: string | null;
  start_time: number | null;
  end_time: number | null;
  poster_image_url: string | null;
  created_at: string | null;
};

type ArtifactRow = {
  event_id: string;
  wallet: string;
  attestation_uid: string;
  created_at: string | null;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("Invalid organizer wallet");
  }
  return normalized;
}

function isMissingSchemaField(detail: string | undefined, field: string) {
  if (!detail) return false;
  return detail.includes(`Could not find the '${field}' column`) ||
    detail.includes(`Could not find the '${field}' relation`);
}

function getEventState(startTime: number | null, endTime: number | null, nowSeconds: number) {
  if (startTime && nowSeconds < startTime) {
    return "upcoming" as const;
  }

  if (endTime && nowSeconds > endTime) {
    return "completed" as const;
  }

  return "live" as const;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organizer = normalizeAddress(url.searchParams.get("wallet") ?? "");
    const supabase = getSupabaseAdmin();

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(
        "event_id, venue_name, event_description, start_time, end_time, poster_image_url, created_at"
      )
      .eq("organizer", organizer)
      .order("start_time", { ascending: false });

    if (eventsError) {
      if (isMissingSchemaField(eventsError.message, "organizer")) {
        return NextResponse.json(
          {
            error: "Organizer dashboard is unavailable until the latest database migration is applied.",
            detail: eventsError.message,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Failed to load organizer events", detail: eventsError.message },
        { status: 500 }
      );
    }

    const eventRows = (events ?? []) as EventRow[];
    const eventIds = eventRows.map((event) => event.event_id);

    let artifactRows: ArtifactRow[] = [];
    if (eventIds.length > 0) {
      const { data: artifacts, error: artifactsError } = await supabase
        .from("attendance_artifacts")
        .select("event_id, wallet, attestation_uid, created_at")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      if (artifactsError) {
        return NextResponse.json(
          { error: "Failed to load attendance records", detail: artifactsError.message },
          { status: 500 }
        );
      }

      artifactRows = (artifacts ?? []) as ArtifactRow[];
    }

    const statsByEvent = new Map<
      string,
      {
        claimCount: number;
        attendeeSet: Set<string>;
        latestClaimedAt: string | null;
        recentClaims: Array<{ wallet: string; attestationUid: string; createdAt: string | null }>;
      }
    >();

    for (const artifact of artifactRows) {
      const existing = statsByEvent.get(artifact.event_id) ?? {
        claimCount: 0,
        attendeeSet: new Set<string>(),
        latestClaimedAt: null,
        recentClaims: [],
      };

      existing.claimCount += 1;
      existing.attendeeSet.add(artifact.wallet);
      existing.latestClaimedAt = existing.latestClaimedAt ?? artifact.created_at;

      if (existing.recentClaims.length < 5) {
        existing.recentClaims.push({
          wallet: artifact.wallet,
          attestationUid: artifact.attestation_uid,
          createdAt: artifact.created_at,
        });
      }

      statsByEvent.set(artifact.event_id, existing);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const dashboardEvents = eventRows.map((event) => {
      const stats = statsByEvent.get(event.event_id);
      return {
        eventId: event.event_id,
        venueName: event.venue_name ?? "Untitled event",
        eventDescription: event.event_description,
        startTime: event.start_time,
        endTime: event.end_time,
        posterImageUrl: event.poster_image_url,
        createdAt: event.created_at,
        state: getEventState(event.start_time, event.end_time, nowSeconds),
        claimCount: stats?.claimCount ?? 0,
        attendeeCount: stats?.attendeeSet.size ?? 0,
        latestClaimedAt: stats?.latestClaimedAt ?? null,
        recentClaims: stats?.recentClaims ?? [],
      };
    });

    const summary = {
      totalEvents: dashboardEvents.length,
      liveEvents: dashboardEvents.filter((event) => event.state === "live").length,
      upcomingEvents: dashboardEvents.filter((event) => event.state === "upcoming").length,
      completedEvents: dashboardEvents.filter((event) => event.state === "completed").length,
      totalClaims: dashboardEvents.reduce((sum, event) => sum + event.claimCount, 0),
      totalAttendees: dashboardEvents.reduce((sum, event) => sum + event.attendeeCount, 0),
      latestClaimedAt:
        dashboardEvents
          .map((event) => event.latestClaimedAt)
          .filter((value): value is string => Boolean(value))
          .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null,
    };

    return NextResponse.json({
      organizer,
      summary,
      events: dashboardEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Invalid organizer wallet" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
