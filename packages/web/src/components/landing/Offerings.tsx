"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, GraduationCap, Layers3 } from "lucide-react";

const offerings = [
  {
    name: "Event Check-In",
    stage: "Events",
    description:
      "For conferences, hackathons, and live programs.",
    details: [
      "Real attendance verification",
      "Wallet-based check-ins",
      "Onchain rewards and gating",
    ],
    href: "/organizer",
    cta: "Open event setup",
    icon: Layers3,
  },
  {
    name: "Education Attendance",
    stage: "Education",
    description:
      "For universities and training programs.",
    details: [
      "Uses existing student records",
      "Prevents proxy attendance",
      "Attendance stays within institutional systems",
    ],
    href: "/education",
    cta: "Explore education mode",
    icon: GraduationCap,
  },
  {
    name: "Verification API",
    stage: "Custom",
    description:
      "For teams building their own products.",
    details: [
      "Embed WiFi-based presence checks",
      "Generate verifiable proofs",
      "Use onchain or offchain outputs",
    ],
    href: "/organizer",
    cta: "Talk to us",
    icon: Building2,
  },
] as const;

export default function Offerings() {
  return (
    <section id="products" className="bg-[#edf5ff] px-6 py-24 text-[#10233f]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="section-kicker">Products</p>
          <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-6xl">
            WiFiProof adapts to how you run attendance.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {offerings.map((offering, index) => {
            const Icon = offering.icon;

            return (
              <motion.div
                key={offering.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={`rounded-[2rem] border p-6 shadow-[0_24px_60px_rgba(37,99,235,0.08)] ${
                  index === 1
                    ? "ink-panel"
                    : "border-[#cfe1ff] bg-white/88 text-[#10233f]"
                }`}
              >
                <div className="flex h-full flex-col">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      index === 1
                        ? "border border-white/10 bg-white/8 text-[#9fc0ff]"
                        : "border border-[#cfe1ff] bg-[#eef5ff] text-[#2563eb]"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <p
                    className={`mt-5 text-xs font-semibold uppercase tracking-[0.16em] ${
                      index === 1 ? "text-[#cfe1ff]" : "text-[#2563eb]"
                    }`}
                  >
                    {offering.stage}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight">
                    {offering.name}
                  </h3>
                  <p
                    className={`mt-4 text-sm leading-7 md:text-base ${
                      index === 1 ? "text-[#d7e6ff]" : "text-[#52637e]"
                    }`}
                  >
                    {offering.description}
                  </p>

                  <div className="mt-5 space-y-2">
                    {offering.details.map((detail) => (
                      <div
                        key={detail}
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                          index === 1
                            ? "border border-white/10 bg-white/8 text-[#e3edff]"
                            : "border border-[#d6e5fb] bg-[#f8fbff] text-[#425779]"
                        }`}
                      >
                        {detail}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={offering.href}
                    className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
                      index === 1 ? "text-white" : "text-[#2563eb]"
                    }`}
                  >
                    {offering.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
