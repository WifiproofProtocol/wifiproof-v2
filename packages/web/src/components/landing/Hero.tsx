"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const promises = [
  "Prove physical presence without collecting guest emails or phone numbers.",
  "Keep exact coordinates on-device instead of leaking them into public metadata.",
  "Give organizers a stronger signal than screenshot-friendly QR check-ins.",
];

const flow = [
  "Guest joins the venue Wi-Fi and opens the event page.",
  "Their device generates the location proof locally.",
  "The event issues an attendance proof instead of harvesting personal data.",
];

const dataYouSkip = [
  "Name fields for a simple check-in",
  "Phone number collection",
  "Email capture before entry",
  "ID scans for regular event attendance",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f3ede4] px-6 pb-24 pt-32 text-[#1f1b17]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(171,108,66,0.18), transparent 30%), radial-gradient(circle at 85% 10%, rgba(95,111,82,0.18), transparent 24%), linear-gradient(rgba(31,27,23,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(31,27,23,0.04) 1px, transparent 1px)",
          backgroundSize: "auto, auto, 44px 44px, 44px 44px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#f3ede4]" />

      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="section-kicker">Privacy-first proof of presence</p>
          <h1 className="display-type mt-4 text-5xl leading-[0.95] tracking-[-0.04em] text-[#1f1b17] md:text-7xl">
            Your venue should verify presence, not harvest personal data.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#5f564d] md:text-xl">
            Every conference, building, and event asks for more than it needs.
            WiFiProof reduces the whole interaction to what actually matters:
            proving someone was physically there.
          </p>

          <div className="mt-8 space-y-3">
            {promises.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[#2d261d]/10 bg-white/60 px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#5f6f52]" />
                <p className="text-sm leading-6 text-[#3c342d] md:text-base">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/organizer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#201b18] px-6 py-3.5 text-sm font-medium text-[#f5efe6] transition hover:bg-[#362e27]"
            >
              Explore organizer flow <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full border border-[#2d261d]/12 bg-white/55 px-6 py-3.5 text-sm font-medium text-[#1f1b17] transition hover:bg-white/80"
            >
              Browse live events
            </Link>
          </div>

          <p className="mt-4 text-sm text-[#6b6258]">
            Built for conferences, community meetups, campuses, coworking
            spaces, and anywhere “I was there” should not turn into surveillance.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative lg:pl-10"
        >
          <div className="paper-panel rounded-[2rem] p-8">
            <p className="section-kicker">At the venue</p>
            <h2 className="display-type mt-3 text-3xl leading-tight text-[#1f1b17] md:text-4xl">
              Attendance becomes a proof, not a data grab.
            </h2>

            <div className="mt-8 space-y-4">
              {flow.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-2xl border border-[#2d261d]/8 bg-[#fbf7f1] px-4 py-4"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#201b18] text-sm font-semibold text-[#f5efe6]">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-6 text-[#433c35] md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ink-panel relative -mt-10 ml-auto max-w-sm rounded-[1.75rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
              What you skip
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#e9ddd0]">
              {dataYouSkip.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ab6c42]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
