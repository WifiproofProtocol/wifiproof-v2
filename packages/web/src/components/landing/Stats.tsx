"use client";
import { motion } from "framer-motion";

const stats = [
  {
    value: "0",
    label: "guest emails required",
    detail: "The proof is about presence, not lead capture.",
  },
  {
    value: "0",
    label: "exact coordinates published",
    detail: "Location stays on-device during the proof flow.",
  },
  {
    value: "2",
    label: "on-site signals combined",
    detail: "Venue Wi-Fi and physical proximity work together.",
  },
  {
    value: "1",
    label: "event page to print and share",
    detail: "Organizers finish with a single QR-linked check-in page.",
  },
];

export default function Stats() {
  return (
    <section className="bg-[#f3ede4] px-6 pb-24">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-[#2d261d]/10 bg-[#e7dccb] p-6 md:p-8">
        <div className="grid gap-px overflow-hidden rounded-[2rem] border border-[#2d261d]/10 bg-[#2d261d]/10 md:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="bg-[#f8f3ea] p-6 md:p-7"
            >
              <p className="display-type text-5xl tracking-[-0.05em] text-[#1f1b17]">
                {stat.value}
              </p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                {stat.label}
              </p>
              <p className="mt-4 text-sm leading-7 text-[#5b5249]">{stat.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
