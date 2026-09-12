"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const signals = [
  { label: "Venue", color: "var(--signal-cobalt)", y: 80 },
  { label: "Proximity", color: "var(--signal-coral)", y: 160 },
  { label: "Human", color: "var(--signal-mint-strong)", y: 240 },
];

function PresenceSignal() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-[4/4.35] w-full max-w-[520px]" aria-label="Venue, proximity, and humanity signals converging into a private proof">
      <div className="absolute inset-0 rounded-[2.25rem] border border-[color:oklch(0.97_0.02_260_/_0.2)] bg-[var(--signal-ink)] shadow-[0_30px_90px_oklch(0.2_0.04_265_/_0.25)]" />
      <svg viewBox="0 0 480 520" className="relative h-full w-full" role="img">
        <title>Three independent presence signals converge into an anonymous attendance proof</title>
        <defs>
          <pattern id="signal-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="oklch(0.98 0.01 85 / 0.065)" strokeWidth="1" />
          </pattern>
          <filter id="signal-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="1" y="1" width="478" height="518" rx="35" fill="url(#signal-grid)" />

        <text x="42" y="48" fill="oklch(0.86 0.02 85)" fontSize="13" fontWeight="600" letterSpacing="1.4">PRESENCE SIGNAL</text>
        <circle cx="424" cy="43" r="5" fill="oklch(0.69 0.19 35)" />

        {signals.map((signal, index) => (
          <g key={signal.label}>
            <text x="42" y={signal.y - 19} fill="oklch(0.78 0.025 85)" fontSize="13">{signal.label}</text>
            <circle cx="58" cy={signal.y} r="7" fill={signal.color} filter="url(#signal-glow)" />
            <path d={`M72 ${signal.y} C170 ${signal.y}, 220 ${260 + (index - 1) * 12}, 314 260`} fill="none" stroke={signal.color} strokeOpacity="0.72" strokeWidth="2.5" strokeLinecap="round" />
            <motion.circle
              cx="82"
              cy={signal.y}
              r="4.5"
              fill={signal.color}
              animate={reduceMotion ? undefined : { cx: [82, 185, 314], cy: [signal.y, signal.y, 260] }}
              transition={{ duration: 2.8, delay: index * 0.42, repeat: Infinity, repeatDelay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </g>
        ))}

        <motion.circle
          cx="333"
          cy="260"
          r="62"
          fill="none"
          stroke="oklch(0.55 0.24 263 / 0.42)"
          strokeWidth="1.5"
          animate={reduceMotion ? undefined : { r: [50, 72], opacity: [0.7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
        <path d="M333 203 390 260 333 317 276 260 333 203Z" fill="oklch(0.965 0.012 88)" />
        <path d="m312 260 14 14 29-32" fill="none" stroke="oklch(0.43 0.22 263)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

        <rect x="42" y="382" width="396" height="2" rx="1" fill="oklch(0.98 0.01 85 / 0.12)" />
      </svg>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-24 pt-32 sm:px-8 lg:pb-32 lg:pt-28">
      <div className="signal-orbit pointer-events-none absolute -left-48 top-12 h-[520px] w-[520px] rounded-full border border-[color:oklch(0.55_0.24_263_/_0.14)]" />
      <div className="pointer-events-none absolute right-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[color:oklch(0.69_0.19_35_/_0.12)] blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <h1 className="display-type max-w-[13ch] text-[clamp(4rem,7vw,7.5rem)] font-semibold leading-[0.86] tracking-[-0.068em]">
            Prove you were there. <span className="text-[var(--signal-cobalt)]">Not who you are.</span>
          </h1>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/organizer" className="signal-button signal-button-primary !px-6 !py-3.5">
              Create an event <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/events" className="signal-button signal-button-secondary !px-6 !py-3.5">
              Check in
            </Link>
          </div>

        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <PresenceSignal />
        </motion.div>
      </div>
    </section>
  );
}
