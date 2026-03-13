"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="bg-[#f4f8ff] px-6 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-[#0f2747] p-8 shadow-[0_28px_80px_rgba(37,99,235,0.18)] md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfe1ff]">
              Ready for the next event
            </p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.04em] text-white md:text-6xl">
              Prove presence. Keep the rest private.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d7e6ff]">
              Start with the organizer guide if you want to run a venue, or go
              straight to live events if you are attending.
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
                Learn the flow, request access if needed, then continue into setup.
              </p>
              <Link
                href="/organizer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#0f2747] transition hover:bg-[#e8f1ff]"
              >
                Open organizer guide <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-transparent p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#cfe1ff]">
                For attendees
              </p>
              <p className="mt-4 text-base leading-7 text-[#d7e6ff]">
                Browse live events, connect on-site, and check in without a form-heavy gate.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
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
