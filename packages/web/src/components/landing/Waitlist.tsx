"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="bg-[#f3ede4] px-6 pb-24 pt-6 text-[#f5efe6]">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-[#1f1b18] p-8 shadow-[0_28px_80px_rgba(15,11,8,0.2)] md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
              Ready for the next event
            </p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.04em] text-white md:text-6xl">
              If the only thing you need to prove is presence, stop asking for
              everything else.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d8cabd]">
              Start with the organizer guide if you want to run a venue, or
              jump straight to live events if you are attending. Organizer
              access stays approval-based for the demo.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid gap-4"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ccb9a2]">
                For organizers
              </p>
              <p className="mt-4 text-base leading-7 text-[#ede2d6]">
                Learn the value story first, request access if your wallet is
                not approved yet, then move into setup when you are ready.
              </p>
              <Link
                href="/organizer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f5efe6] px-5 py-3 text-sm font-medium text-[#1f1b18] transition hover:bg-white"
              >
                Open organizer guide <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-transparent p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ccb9a2]">
                For attendees
              </p>
              <p className="mt-4 text-base leading-7 text-[#d8cabd]">
                Browse live events, connect at the venue, and check in without a
                generic sign-up wall getting in the way.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/14 px-5 py-3 text-sm font-medium text-[#f5efe6] transition hover:bg-white/8"
              >
                Browse live events <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
