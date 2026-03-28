"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

type ProtocolStatsResponse = {
  stats: {
    eventsCount: number;
    attestationsCount: number;
    humanityChecksCount: number;
  };
  latestAttestation: {
    eventId: string;
    eventName: string | null;
    wallet: string;
    attestationUid: string;
    createdAt: string | null;
    easScanUrl: string;
  } | null;
};

function shortenHex(value: string, lead = 6, tail = 4) {
  if (!value) return "-";
  if (value.length <= lead + tail + 3) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatLatestTime(value: string | null) {
  if (!value) return "Recently minted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently minted";
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} at ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function Stats() {
  const [data, setData] = useState<ProtocolStatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/protocol/stats", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load protocol stats");
        }
        return (await response.json()) as ProtocolStatsResponse;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        value: formatCount(data?.stats.eventsCount ?? 0),
        label: "events created",
      },
      {
        value: formatCount(data?.stats.attestationsCount ?? 0),
        label: "attestations minted",
      },
      {
        value: formatCount(data?.stats.humanityChecksCount ?? 0),
        label: "humanity checks",
      },
    ],
    [data]
  );

  return (
    <section className="bg-[#f4f8ff] px-6 pb-24 text-[#10233f]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[2rem] border border-[#cfe1ff] bg-[#0f2747] p-6 text-white shadow-[0_24px_70px_rgba(15,39,71,0.18)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfe1ff]">
              Live now
            </p>
            <div className="mt-6 grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-[#15345c] px-4 py-5">
                  <p className="display-type text-4xl leading-none tracking-[-0.05em] text-white md:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#cfe1ff]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#cfe1ff] bg-white/88 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)] md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  Latest attestation
                </p>
                <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-4xl">
                  A real check-in, not a mockup.
                </h2>
              </div>
              {data?.latestAttestation && (
                <a
                  href={data.latestAttestation.easScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#cfe1ff] bg-[#f6faff] px-4 py-2 text-sm font-semibold text-[#10233f] transition hover:bg-white"
                >
                  View on EASScan
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>

            {data?.latestAttestation ? (
              <div className="mt-6 grid gap-4 rounded-[1.75rem] border border-[#dbe8fb] bg-[#f8fbff] p-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                    Event
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#10233f]">
                    {data.latestAttestation.eventName ?? "WiFiProof event"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#52637e]">
                    {formatLatestTime(data.latestAttestation.createdAt)}
                  </p>
                </div>
                <div className="space-y-3 text-sm text-[#52637e]">
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                      Recipient
                    </span>
                    <span className="font-mono text-[#10233f]">
                      {shortenHex(data.latestAttestation.wallet)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#6a89b6]">
                      Attestation UID
                    </span>
                    <span className="font-mono text-[#10233f]">
                      {shortenHex(data.latestAttestation.attestationUid, 10, 8)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.75rem] border border-[#dbe8fb] bg-[#f8fbff] p-5 text-sm leading-7 text-[#52637e]">
                The first live attestation will appear here after the next successful check-in.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
