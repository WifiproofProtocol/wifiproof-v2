"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, ShieldCheck, Ticket } from "lucide-react";

const audienceCards = [
  {
    title: "I run events",
    subtitle: "Web3-native organizers",
    description:
      "For conferences, hackathons, crypto communities, and live programs that want stronger attendance, reputation, and reward flows.",
    bullets: [
      "Verify real attendance",
      "Reduce fake check-ins",
      "Keep the onchain layer visible where it matters",
    ],
    href: "/organizer",
    cta: "Open organizer flow",
    icon: Ticket,
  },
  {
    title: "I run a school or program",
    subtitle: "Lecturers and institutions",
    description:
      "For classrooms, universities, bootcamps, and training programs that want private anti-fraud attendance without rebuilding identity from scratch.",
    bullets: [
      "Use existing student identity systems",
      "Make proxy attendance harder",
      "Keep blockchain optional in the user experience",
    ],
    href: "/education",
    cta: "See education mode",
    icon: GraduationCap,
  },
  {
    title: "I need to check in",
    subtitle: "Attendees and students",
    description:
      "For people entering an event or attendance flow. Open the check-in page, follow the required verification steps, and complete your proof of presence.",
    bullets: [
      "Wallet-based demo flow live today",
      "Desktop works best for proof generation",
      "Different deployments can use different access methods",
    ],
    href: "/events",
    cta: "Open check-in flow",
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
            Start from the workflow that fits you.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#52637e]">
            WiFiProof is a platform, not a single attendance screen. The same verification
            foundation can be tailored for Web3 events, institutions, and end users.
          </p>
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
