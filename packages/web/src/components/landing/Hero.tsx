"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, MapPin, ShieldCheck, Wifi } from "lucide-react";

export default function Hero() {
  const contractAddress = process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS?.trim();
  const contractHref = contractAddress
    ? `https://sepolia.basescan.org/address/${contractAddress}`
    : null;

  return (
    <section className="relative overflow-hidden bg-[#f4f8ff] px-6 pb-24 pt-32 text-[#10233f]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 12%, rgba(96,165,250,0.24), transparent 26%), radial-gradient(circle at 88% 10%, rgba(37,99,235,0.18), transparent 22%), radial-gradient(circle at 72% 78%, rgba(191,219,254,0.7), transparent 24%), linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)",
          backgroundSize: "auto, auto, auto, 44px 44px, 44px 44px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#f4f8ff]" />

      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="section-kicker">Private proof of attendance</p>
          <h1 className="display-type mt-4 text-6xl leading-[0.9] tracking-[-0.05em] text-[#10233f] md:text-7xl">
            Prove you were there. Without exposing who you are.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#52637e] md:text-xl">
            WiFiProof is a privacy-preserving attendance system that verifies real-world
            presence using WiFi and zero-knowledge proofs.
          </p>
          <p className="mt-3 text-base leading-7 text-[#61728d] md:text-lg">
            Built for events, classrooms, and any environment where presence matters.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-[#1f3f78]">
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">WiFi verification</span>
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">Zero-knowledge proofs</span>
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">Privacy first</span>
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">Built on Base</span>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/organizer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
            >
              Open event setup <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full border border-[#93b7e8]/30 bg-white/82 px-6 py-3.5 text-sm font-medium text-[#10233f] transition hover:bg-white"
            >
              Open check-in
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#61728d]">
            <span>For events, classrooms, and live programs.</span>
            {contractHref && (
              <a
                href={contractHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#2563eb] transition hover:text-[#1d4ed8]"
              >
                View contract
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative lg:pl-10"
        >
          <div className="ink-panel rounded-[2rem] p-8">
            <p className="section-kicker !text-[#cfe1ff]">What gets checked</p>
            <h2 className="display-type mt-3 text-3xl leading-tight text-white md:text-4xl">
              Real presence. Minimal data.
            </h2>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9fc0ff]">WiFi</p>
                <p className="mt-3 text-base leading-7 text-[#e3edff]">
                  Venue WiFi helps confirm the check-in is happening in the right place.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9fc0ff]">Proof</p>
                <p className="mt-3 text-base leading-7 text-[#e3edff]">
                  Local zero-knowledge proofs confirm presence without exposing raw location data.
                </p>
              </div>
            </div>
          </div>

          <div className="paper-panel relative -mt-8 ml-auto max-w-sm rounded-[1.75rem] p-6">
            <div className="grid gap-4 text-sm text-[#314a73]">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-[#2563eb]" />
                <span>Venue Wi-Fi anchors the check-in</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-[#2563eb]" />
                <span>Location proof runs locally</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
                <span>Onchain records for events, institutional records for schools</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
