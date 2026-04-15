"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section id="beta" className="bg-[#f4f8ff] px-6 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-[#0f2747] p-8 shadow-[0_28px_80px_rgba(37,99,235,0.18)] md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfe1ff]">
              Get access
            </p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.04em] text-white md:text-6xl">
              Use WiFiProof for events, schools, or pilots.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d7e6ff]">
              Request access for your event, classroom, or product team. The current demo flow
              stays open for testers while we onboard new partners.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid gap-4"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#cfe1ff]">
                For organizers
              </p>
              <p className="mt-4 text-base leading-7 text-[#e7f0ff]">
                Start with event setup or request a pilot for your school or institution.
              </p>
              <Link
                href="/organizer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#0f2747] transition hover:bg-[#e8f1ff]"
              >
                Request access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-transparent p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#cfe1ff]">
                For attendees and testers
              </p>
              <p className="mt-4 text-base leading-7 text-[#d7e6ff]">
                Open the current demo flow and complete a real check-in.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open check-in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
