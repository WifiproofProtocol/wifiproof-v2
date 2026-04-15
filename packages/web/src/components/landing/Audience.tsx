"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, ShieldCheck, Ticket } from "lucide-react";

const audienceCards = [
  {
    title: "For Event Organizers",
    subtitle: "Events",
    description:
      "Run events with real attendance, not guesswork.",
    bullets: [
      "Verify actual presence",
      "Prevent fake check-ins",
      "Enable onchain rewards and reputation",
    ],
    href: "/organizer",
    cta: "Open event setup",
    icon: Ticket,
  },
  {
    title: "For Schools and Lecturers",
    subtitle: "Education",
    description:
      "Attendance that students cannot fake.",
    bullets: [
      "Uses existing student identity systems",
      "Confirms physical presence in class",
      "No need for proof of humanity",
    ],
    href: "/education",
    cta: "Explore education mode",
    icon: GraduationCap,
  },
  {
    title: "For Attendees and Students",
    subtitle: "Check-in",
    description:
      "Check in and prove you were there.",
    bullets: [
      "Current demo uses wallet-based check-in",
      "Complete verification in seconds",
      "Works best on desktop",
    ],
    href: "/events",
    cta: "Open check-in",
    icon: ShieldCheck,
  },
] as const;

export default function Audience() {
  return (
    <section id="who" className="bg-[#f4f8ff] px-6 py-24 text-[#10233f]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="section-kicker">Who are you?</p>
          <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-6xl">
            Choose your flow.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {audienceCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="paper-panel rounded-[2rem] p-6"
              >
                <div className="flex h-full flex-col">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#cfe1ff] bg-[#eef5ff] text-[#2563eb]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                    {card.subtitle}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#10233f]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#52637e] md:text-base">
                    {card.description}
                  </p>

                  <div className="mt-5 space-y-2 text-sm leading-6 text-[#425779]">
                    {card.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="rounded-2xl border border-[#d6e5fb] bg-[#f8fbff] px-4 py-3"
                      >
                        {bullet}
                      </div>
                    ))}
                  </div>

                  <Link
                    href={card.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]"
                  >
                    {card.cta}
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
