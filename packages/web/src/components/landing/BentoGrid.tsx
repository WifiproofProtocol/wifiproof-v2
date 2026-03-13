"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, Users, Zap } from "lucide-react";

const cards = [
  {
    title: "Make your event check-in harder to fake",
    desc: "WiFiProof gives organizers a stronger signal than QR codes alone, because presence is anchored to the venue itself.",
    icon: <Shield className="h-7 w-7" />,
    tone:
      "bg-[#1f1b18] text-[#f4efe6] border-white/10 [&_p]:text-[#ddd0c2] [&_svg]:text-[#ccb9a2]",
    className: "md:col-span-2",
  },
  {
    title: "Respect guest privacy",
    desc: "You can verify presence without building another spreadsheet full of attendee contact data.",
    icon: <Users className="h-7 w-7" />,
    tone:
      "bg-white/70 text-[#1f1b17] border-[#2d261d]/10 [&_p]:text-[#5d554d] [&_svg]:text-[#5f6f52]",
    className: "md:col-span-1",
  },
  {
    title: "Keep organizer control",
    desc: "Organizer creation is allowlisted, so official venue check-ins stay in the hands of approved wallets.",
    icon: <CheckCircle2 className="h-7 w-7" />,
    tone:
      "bg-[#efe2d0] text-[#1f1b17] border-[#2d261d]/10 [&_p]:text-[#5d554d] [&_svg]:text-[#ab6c42]",
    className: "md:col-span-1",
  },
  {
    title: "Built for demos, conferences, campuses, and gated spaces",
    desc: "Anywhere the real claim is “this person showed up,” the flow stays simple for guests and credible for organizers.",
    icon: <Zap className="h-7 w-7" />,
    tone:
      "bg-white/70 text-[#1f1b17] border-[#2d261d]/10 [&_p]:text-[#5d554d] [&_svg]:text-[#5f6f52]",
    className: "md:col-span-2",
  },
];

export default function BentoGrid() {
  return (
    <section id="organizers" className="bg-[#f3ede4] px-6 py-24 text-[#1f1b17]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 max-w-3xl"
        >
          <p className="section-kicker">For organizers</p>
          <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-6xl">
            Better proof for you. Less unnecessary exposure for everyone else.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#5f564d]">
            WiFiProof is strongest when the venue wants confidence without
            turning the guest experience into a form-filling ritual.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 auto-rows-[minmax(240px,auto)]">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`rounded-[2rem] border p-8 shadow-[0_24px_60px_rgba(57,43,30,0.08)] ${card.tone} ${card.className}`}
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
      </div>
    </section>
  );
}
