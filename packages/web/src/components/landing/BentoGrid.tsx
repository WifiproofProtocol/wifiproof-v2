"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, Users } from "lucide-react";

const cards = [
  {
    title: "Stronger than QR-only",
    desc: "Presence is tied to the venue itself, not just a code that can be shared around.",
    icon: <Shield className="h-7 w-7" />,
    tone:
      "bg-[#0f2747] text-white border-white/10 [&_p]:text-[#d7e6ff] [&_svg]:text-[#9fc0ff]",
    className: "md:col-span-1",
  },
  {
    title: "Better guest experience",
    desc: "Guests prove they were there without a heavy sign-up wall or unnecessary data collection.",
    icon: <Users className="h-7 w-7" />,
    tone:
      "bg-white/88 text-[#10233f] border-[#cfe1ff] [&_p]:text-[#52637e] [&_svg]:text-[#2563eb]",
    className: "md:col-span-1",
  },
  {
    title: "Approved organizer access",
    desc: "Official event creation stays tied to approved wallets for the demo and beyond.",
    icon: <CheckCircle2 className="h-7 w-7" />,
    tone:
      "bg-[#dbeafe] text-[#10233f] border-[#bfdbfe] [&_p]:text-[#425779] [&_svg]:text-[#1d4ed8]",
    className: "md:col-span-1",
  },
];

export default function BentoGrid() {
  return (
    <section id="organizers" className="bg-[#f4f8ff] px-6 py-24 text-[#10233f]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          <p className="section-kicker">For organizers</p>
          <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-6xl">
            A simple organizer story.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#52637e]">
            If you run the venue, you get a stronger attendance signal. If you are
            the guest, you keep more of your privacy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 auto-rows-[minmax(220px,auto)]">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`rounded-[2rem] border p-8 shadow-[0_24px_60px_rgba(37,99,235,0.08)] ${card.tone} ${card.className}`}
            >
              <div className="flex h-full flex-col">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-current/10 bg-current/5">
                  {card.icon}
                </div>

                <h3 className="text-2xl font-semibold leading-tight">
                  {card.title}
                </h3>

                <p className="mt-4 leading-8">
                  {card.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-8 flex flex-col gap-4 rounded-[2rem] border border-[#bfdbfe] bg-white/86 p-6 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              Next step
            </p>
            <p className="mt-2 text-base leading-7 text-[#52637e]">
              Start with the organizer guide, then continue into setup when your wallet is approved.
            </p>
          </div>
          <Link
            href="/organizer"
            className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
          >
            Open organizer guide
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
