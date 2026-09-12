"use client";

import { ArrowRight, CalendarDays, Loader2, Radio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function EventRowItem({ event, isLive }: { event: EventRow; isLive: boolean }) {
  return (
    <article className="grid gap-5 border-b border-[var(--signal-line)] py-6 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--signal-ink)]">
        {event.poster_image_url ? (
          <Image src={event.poster_image_url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--signal-canvas)]">
            <Radio className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-xl font-semibold tracking-[-0.025em]">{event.venue_name}</h3>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--signal-mint)] px-2.5 py-1 text-xs font-bold text-[var(--signal-ink)]">
              <Radio className="h-3 w-3" /> Live
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-[var(--signal-muted)]">
          <CalendarDays className="h-4 w-4" /> {formatEventWindow(event.start_time, event.end_time)}
        </p>
        {event.event_description?.trim() ? (
          <p className="mt-2 line-clamp-1 text-sm text-[var(--signal-muted)]">{event.event_description}</p>
        ) : null}
      </div>

      <Link href={`/event/${event.event_id}`} className="signal-button signal-button-secondary justify-self-start sm:justify-self-end">
        Check in <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
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
      if (!response.ok) throw new Error(await response.text());
      setData((await response.json()) as ActiveEventsResponse);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
    const interval = window.setInterval(() => void fetchEvents(), 30_000);
    return () => window.clearInterval(interval);
  }, [fetchEvents]);

  const events = useMemo(
    () => [...(data?.todayEvents ?? [])].sort((a, b) => a.start_time - b.start_time),
    [data?.todayEvents],
  );
  const liveIds = useMemo(() => new Set((data?.liveEvents ?? []).map((event) => event.event_id)), [data?.liveEvents]);

  return (
    <>
      <section className="border-b border-[var(--signal-line)] pb-10">
        <p className="product-label">Check in</p>
        <h1 className="product-page-title">Events</h1>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-3 py-16 text-sm text-[var(--signal-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--signal-cobalt)]" /> Loading events
        </div>
      ) : error ? (
        <div className="my-8 rounded-2xl border border-[var(--signal-coral)] bg-[color:oklch(0.69_0.19_35_/_0.08)] p-5 text-sm">{error}</div>
      ) : events.length ? (
        <section aria-label="Today's events">
          {events.map((event) => <EventRowItem key={event.event_id} event={event} isLive={liveIds.has(event.event_id)} />)}
        </section>
      ) : (
        <section className="py-20 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-[var(--signal-cobalt)]" />
          <h2 className="mt-5 text-xl font-semibold">No events today</h2>
          <p className="mt-2 text-sm text-[var(--signal-muted)]">Check the event link from your organizer.</p>
        </section>
      )}
    </>
  );
}
