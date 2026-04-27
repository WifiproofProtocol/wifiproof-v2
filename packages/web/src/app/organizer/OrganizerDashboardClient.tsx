"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Copy,
  Loader2,
  Radio,
  Users,
} from "lucide-react";
import { useAccount } from "wagmi";

import WalletCard from "@/components/wallet/WalletCard";

type DashboardEvent = {
  eventId: string;
  venueName: string;
  eventDescription: string | null;
  startTime: number | null;
  endTime: number | null;
  posterImageUrl: string | null;
  createdAt: string | null;
  state: "live" | "upcoming" | "completed";
  claimCount: number;
  attendeeCount: number;
  latestClaimedAt: string | null;
  recentClaims: Array<{
    wallet: string;
    attestationUid: string;
    createdAt: string | null;
  }>;
};

type DashboardResponse = {
  organizer: string;
  summary: {
    totalEvents: number;
    liveEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalClaims: number;
    totalAttendees: number;
    latestClaimedAt: string | null;
  };
  events: DashboardEvent[];
};

function formatWindow(startTime: number | null, endTime: number | null) {
  if (!startTime || !endTime) {
    return "Event timing not set";
  }

  const startDate = new Date(startTime * 1000);
  const endDate = new Date(endTime * 1000);
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

function formatWallet(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(value: string | null) {
  if (!value) return "No claims yet";
  return new Date(value).toLocaleString();
}

export default function OrganizerDashboardClient() {
  const { address } = useAccount();
  const walletAddress = address ?? "";
  const [walletReady, setWalletReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [copiedEventId, setCopiedEventId] = useState("");

  const handleWalletReady = useCallback(() => setWalletReady(true), []);

  const fetchDashboard = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(
        `/api/organizer/dashboard?wallet=${encodeURIComponent(walletAddress)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load organizer dashboard");
      }

      const json = (await response.json()) as DashboardResponse;
      setData(json);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load organizer dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setWalletReady(false);
      setData(null);
      setError("");
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletReady || !walletAddress) {
      return;
    }

    void fetchDashboard();
    const interval = window.setInterval(() => {
      void fetchDashboard();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [fetchDashboard, walletAddress, walletReady]);

  const latestClaimCopy = useMemo(
    () => (data?.summary.latestClaimedAt ? formatTimestamp(data.summary.latestClaimedAt) : "No claims yet"),
    [data?.summary.latestClaimedAt]
  );

  async function handleCopyCheckInLink(eventId: string) {
    try {
      const origin = typeof window === "undefined" ? "" : window.location.origin;
      const url = `${origin}/event/${eventId}`;
      await navigator.clipboard.writeText(url);
      setCopiedEventId(eventId);
      window.setTimeout(() => setCopiedEventId(""), 1500);
    } catch (copyError) {
      console.error("[organizer] copy link failed", copyError);
    }
  }

  if (!walletReady || !walletAddress) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Organizer dashboard
          </p>
          <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
            Connect the organizer wallet to manage live events.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52637e] md:text-base">
            This dashboard shows the events created by your approved wallet, recent
            attendance claims, and quick links back into the check-in flow.
          </p>

          <div className="mt-6">
            <WalletCard walletAddress={walletAddress} onReady={handleWalletReady} />
          </div>
        </div>

        <div className="ink-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7ff]">
            What you get
          </p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-[#d6e7ff]">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
              Per-event attendance counts and live status.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
              Recent attendee wallets and claim timestamps.
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
              Fast links to the attendee check-in page and organizer setup flow.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Organizer dashboard
          </p>
          <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
            Monitor event activity without leaving the app.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#52637e] md:text-base">
            Connected as {formatWallet(walletAddress)}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/organizer/setup"
            className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Create another event
          </Link>
          <button
            type="button"
            onClick={() => void fetchDashboard()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c9daf5] bg-white px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:text-[#8da2c1]"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.6rem] border border-[#e0b7b2] bg-[#fff3f1] px-5 py-4 text-sm text-[#a5483c]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Events
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#10233f]">
            {data?.summary.totalEvents ?? 0}
          </p>
          <p className="mt-2 text-sm text-[#6a7891]">
            {data?.summary.liveEvents ?? 0} live right now
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Attendance claims
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#10233f]">
            {data?.summary.totalClaims ?? 0}
          </p>
          <p className="mt-2 text-sm text-[#6a7891]">
            Across all organizer events
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Unique attendees
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#10233f]">
            {data?.summary.totalAttendees ?? 0}
          </p>
          <p className="mt-2 text-sm text-[#6a7891]">
            Distinct wallets across your events
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[#cfe1ff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
            Latest claim
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#10233f]">
            {latestClaimCopy}
          </p>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="rounded-[1.75rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="flex items-center gap-3 text-[#2563eb]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading organizer activity...</span>
          </div>
        </div>
      ) : null}

      {data && data.events.length === 0 ? (
        <div className="rounded-[1.9rem] border border-dashed border-[#cfe1ff] bg-white/70 px-5 py-12 text-center shadow-[0_18px_50px_rgba(37,99,235,0.06)]">
          <p className="text-lg font-semibold text-[#10233f]">No events yet for this wallet.</p>
          <p className="mt-3 text-sm leading-7 text-[#6a7891]">
            Use organizer setup to publish your first event and start collecting
            attendance records.
          </p>
          <Link
            href="/organizer/setup"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Open organizer setup
          </Link>
        </div>
      ) : null}

      {data?.events.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.events.map((event) => (
            <article
              key={event.eventId}
              className="rounded-[1.9rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.1)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        event.state === "live"
                          ? "border-[#7dd3a0] bg-[#eef9f1] text-[#1d6f42]"
                          : event.state === "upcoming"
                            ? "border-[#cfe1ff] bg-[#f3f8ff] text-[#2563eb]"
                            : "border-[#d7e4f6] bg-[#f8fbff] text-[#61728d]"
                      }`}
                    >
                      {event.state === "live" ? <Radio className="h-3.5 w-3.5" /> : null}
                      {event.state === "live"
                        ? "Live"
                        : event.state === "upcoming"
                          ? "Upcoming"
                          : "Completed"}
                    </span>
                    <span className="rounded-full border border-[#d7e4f6] bg-[#f8fbff] px-3 py-1 text-xs font-semibold text-[#61728d]">
                      {event.claimCount} claims
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-[#10233f]">
                    {event.venueName}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#52637e]">
                    {event.eventDescription?.trim()
                      ? event.eventDescription
                      : "Private attendance verification with venue network checks and local proof generation."}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Event window
                  </span>
                  <p className="text-sm font-medium leading-7 text-[#10233f]">
                    {formatWindow(event.startTime, event.endTime)}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-[#d7e4f6] bg-[#f8fbff] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                    Attendees
                  </span>
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-[#10233f]">
                    <Users className="h-4 w-4 text-[#2563eb]" />
                    {event.attendeeCount} unique wallets
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-[#d7e4f6] bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  <CalendarDays className="h-4 w-4" />
                  Latest activity
                </div>
                <p className="mt-2 text-sm leading-7 text-[#10233f]">
                  {formatTimestamp(event.latestClaimedAt)}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  Recent claims
                </p>
                {event.recentClaims.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {event.recentClaims.map((claim) => (
                      <div
                        key={`${event.eventId}-${claim.attestationUid}`}
                        className="flex items-center justify-between rounded-[1.1rem] border border-[#d7e4f6] bg-[#f8fbff] px-3 py-3 text-sm"
                      >
                        <span className="font-mono text-[#2563eb]">{formatWallet(claim.wallet)}</span>
                        <span className="text-[#6a7891]">{formatTimestamp(claim.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#6a7891]">
                    No attendee claims have been archived yet for this event.
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/event/${event.eventId}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#17345e]"
                >
                  Open attendee page
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleCopyCheckInLink(event.eventId)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#c9daf5] bg-white px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-[#eef4ff]"
                >
                  <Copy className="h-4 w-4" />
                  {copiedEventId === event.eventId ? "Copied" : "Copy check-in link"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
