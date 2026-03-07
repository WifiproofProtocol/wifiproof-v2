"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Radio } from "lucide-react";

type EventRow = {
  event_id: string;
  start_time: number;
  end_time: number;
  venue_name: string;
};

type ActiveEventsResponse = {
  now: number;
  date: string;
  liveEvents: EventRow[];
  upcomingEvents: EventRow[];
  todayEvents: EventRow[];
};

function formatRange(start: number, end: number) {
  const startDate = new Date(start * 1000);
  const endDate = new Date(end * 1000);
  return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
}

function EventCard({ event, isLive }: { event: EventRow; isLive: boolean }) {
  return (
    <article className="rounded-2xl border border-cyan-900/40 bg-slate-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{event.venue_name}</h3>
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
            <Radio className="h-3.5 w-3.5" />
            Live
          </span>
        ) : (
          <span className="rounded-full border border-cyan-900/50 bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-300">
            Upcoming
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm text-slate-300">
        <p className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 text-cyan-400" />
          <span>{formatRange(event.start_time, event.end_time)}</span>
        </p>
        <p className="break-all font-mono text-xs text-slate-400">{event.event_id}</p>
      </div>

      <div className="mt-5">
        <Link
          href={`/event/${event.event_id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-cyan-400"
        >
          Open Event Check-in
        </Link>
      </div>
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

  const liveEventIds = useMemo(() => {
    return new Set((data?.liveEvents ?? []).map((event) => event.event_id));
  }, [data?.liveEvents]);

  const sortedTodayEvents = useMemo(() => {
    const events = data?.todayEvents ?? [];
    return [...events].sort((a, b) => a.start_time - b.start_time);
  }, [data?.todayEvents]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cyan-900/40 bg-slate-900/60 p-8 text-slate-300">
        Loading active events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-8 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-900/40 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Events</h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse live and upcoming events, then open check-in for the one you are attending.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-900/50 bg-cyan-950/40 px-3 py-1.5 text-xs text-cyan-300">
          <CalendarDays className="h-4 w-4" />
          UTC day: {data?.date ?? "-"}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Live Now</h2>
        {(data?.liveEvents.length ?? 0) > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(data?.liveEvents ?? []).map((event) => (
              <EventCard key={event.event_id} event={event} isLive />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-900/40 bg-slate-900/40 p-6 text-sm text-slate-400">
            No live events at the moment.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Today</h2>
        {sortedTodayEvents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedTodayEvents.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                isLive={liveEventIds.has(event.event_id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-900/40 bg-slate-900/40 p-6 text-sm text-slate-400">
            No events scheduled for today.
          </div>
        )}
      </section>
    </div>
  );
}
