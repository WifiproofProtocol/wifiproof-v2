"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, ShieldCheck, Wifi } from "lucide-react";

export default function Hero() {
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
          <p className="section-kicker">Simple story, stronger proof</p>
          <h1 className="display-type mt-4 text-5xl leading-[0.95] tracking-[-0.04em] text-[#10233f] md:text-7xl">
            The first thing people ask for at an event is the Wi-Fi password.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#52637e] md:text-xl">
            WiFiProof turns that moment into proof of presence. Guests connect at
            the venue, prove proximity privately, and check in without giving away
            extra personal data.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-[#1f3f78]">
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">
              No email wall
            </span>
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">
              No raw location leak
            </span>
            <span className="rounded-full border border-[#93b7e8]/35 bg-white/82 px-4 py-2">
              Just proof you were there
            </span>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/organizer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
            >
              Explore organizer flow <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full border border-[#93b7e8]/30 bg-white/82 px-6 py-3.5 text-sm font-medium text-[#10233f] transition hover:bg-white"
            >
              Browse live events
            </Link>
          </div>

          <p className="mt-4 text-sm text-[#61728d]">
            Venue Wi-Fi + zero-knowledge geolocation + attendance proof.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative lg:pl-10"
        >
          <div className="ink-panel rounded-[2rem] p-8">
            <p className="section-kicker !text-[#cfe1ff]">In one glance</p>
            <h2 className="display-type mt-3 text-3xl leading-tight text-white md:text-4xl">
              Problem. Solution. Result.
            </h2>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9fc0ff]">
                  Problem
                </p>
                <p className="mt-3 text-base leading-7 text-[#e3edff]">
                  Events ask for too much data just to confirm someone showed up.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9fc0ff]">
                  Solution
                </p>
                <p className="mt-3 text-base leading-7 text-[#e3edff]">
                  Use venue Wi-Fi and private geolocation proofs to verify presence.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9fc0ff]">
                  Result
                </p>
                <p className="mt-3 text-base leading-7 text-[#e3edff]">
                  Organizers get stronger attendance proof. Guests keep their privacy.
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
                <span>The final claim is privacy-preserving</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
