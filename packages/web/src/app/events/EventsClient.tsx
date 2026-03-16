"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Loader2,
  Radio,
  ShieldCheck,
  Wifi,
} from "lucide-react";

type EventRow = {
  event_id: string;
  start_time: number;
  end_time: number;
  venue_name: string;
  event_description: string | null;
  poster_image_url: string | null;
};

type ActiveEventsResponse = {
  now: number;
  date: string;
  liveEvents: EventRow[];
  upcomingEvents: EventRow[];
  todayEvents: EventRow[];
};

function formatEventWindow(start: number, end: number) {
  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  if (sameDay) {
    return `${startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} · ${startDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
}

function EventCard({ event, isLive }: { event: EventRow; isLive: boolean }) {
  return (
    <article className="overflow-hidden rounded-[1.9rem] border border-[#cfe1ff] bg-white/88 shadow-[0_24px_70px_rgba(37,99,235,0.1)]">
      {event.poster_image_url ? (
        <div className="relative aspect-[16/9] bg-[#dcecff]">
          <Image
            src={event.poster_image_url}
            alt={`${event.venue_name} poster`}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.35),_transparent_28%),linear-gradient(135deg,_#dbeafe,_#eff6ff_52%,_#ffffff)] px-6 py-6">
          <div className="flex h-full flex-col justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-white/80 text-[#2563eb] shadow-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                WiFiProof
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#10233f]">
                {event.venue_name}
              </h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 px-5 py-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#10233f]">{event.venue_name}</h3>
            <p className="mt-2 text-sm leading-7 text-[#52637e]">
              {event.event_description?.trim()
                ? event.event_description
                : "Secure attendee check-in with a venue-network gate and local zero-knowledge proof generation."}
            </p>
          </div>

          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7dd3a0] bg-[#eef9f1] px-3 py-1 text-xs font-semibold text-[#1d6f42]">
              <Radio className="h-3.5 w-3.5" />
              Live now
            </span>
          ) : (
            <span className="rounded-full border border-[#cfe1ff] bg-[#f3f8ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
              Upcoming
            </span>
          )}
        </div>

        <div className="rounded-[1.35rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Event window
          </span>
          <p className="text-sm font-medium leading-7 text-[#10233f]">
            {formatEventWindow(event.start_time, event.end_time)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Event ID
          </p>
          <p className="break-all rounded-[1.2rem] border border-[#d7e4f6] bg-white px-4 py-3 font-mono text-xs text-[#486284]">
            {event.event_id}
          </p>
        </div>

        <Link
          href={`/event/${event.event_id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#17345e]"
        >
          Open event check-in
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function Section({
  title,
  description,
  events,
  liveEventIds,
  emptyMessage,
}: {
  title: string;
  description: string;
  events: EventRow[];
  liveEventIds: Set<string>;
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="display-type text-3xl tracking-[-0.03em] text-[#10233f]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#52637e]">{description}</p>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              isLive={liveEventIds.has(event.event_id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-[#cfe1ff] bg-white/70 px-5 py-10 text-center text-sm leading-7 text-[#6a7891]">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default function EventsClient() {
  const [data, setData] = useState<ActiveEventsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/events/active", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as ActiveEventsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
    const interval = setInterval(() => {
      void fetchEvents();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const liveEventIds = useMemo(
    () => new Set((data?.liveEvents ?? []).map((event) => event.event_id)),
    [data?.liveEvents]
  );

  const sortedTodayEvents = useMemo(() => {
    const events = data?.todayEvents ?? [];
    return [...events].sort((a, b) => a.start_time - b.start_time);
  }, [data?.todayEvents]);

  const liveCount = data?.liveEvents.length ?? 0;
  const upcomingCount = data?.upcomingEvents.length ?? 0;
  const totalTodayCount = data?.todayEvents.length ?? 0;

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/88 p-8 shadow-[0_24px_70px_rgba(37,99,235,0.08)]">
        <div className="flex items-center gap-3 text-[#2563eb]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading today&apos;s event slate...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-[#e0b7b2] bg-[#fff3f1] p-8 text-[#a5483c] shadow-[0_20px_50px_rgba(165,72,60,0.08)]">
        <p className="text-sm font-medium leading-7">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-4">
          <p className="section-kicker">Events</p>
          <h1 className="display-type text-5xl leading-[0.98] tracking-[-0.04em] text-[#10233f] md:text-7xl">
            Find the event, open the check-in page, and prove you were there.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#52637e] md:text-lg">
            Live events update automatically. Open the event you are attending
            to verify humanity, generate the proof locally, and mint your
            attendance attestation.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#486284]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-white/80 px-3 py-2">
              <Wifi className="h-4 w-4 text-[#2563eb]" />
              Venue network check
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-white/80 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
              Private on-device proof
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
              Live now
            </p>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#10233f]">
              {liveCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
              Upcoming today
            </p>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#10233f]">
              {upcomingCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
              UTC day
            </p>
            <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-[#10233f]">
              <CalendarDays className="h-5 w-5 text-[#2563eb]" />
              {data?.date ?? "-"}
            </p>
            <p className="mt-2 text-xs leading-6 text-[#6a7891]">
              {totalTodayCount} event{totalTodayCount === 1 ? "" : "s"} scheduled.
            </p>
          </div>
        </div>
      </section>

      <Section
        title="Live now"
        description="These events are currently within their active attendance window."
        events={data?.liveEvents ?? []}
        liveEventIds={liveEventIds}
        emptyMessage="No live events at the moment. Check again closer to the event start time."
      />

      <Section
        title="Today"
        description="Everything scheduled for the current UTC day, including live and upcoming events."
        events={sortedTodayEvents}
        liveEventIds={liveEventIds}
        emptyMessage="No events are scheduled for today yet."
      />
    </div>
  );
}
