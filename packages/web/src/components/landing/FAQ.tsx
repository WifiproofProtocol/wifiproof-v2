"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Why not just use a QR code?",
    answer:
      "A QR code alone can be screenshotted, forwarded, or claimed remotely. WiFiProof adds venue network checks, local ZK proximity proofs, and on-chain attestations so the attendance signal is harder to fake.",
  },
  {
    question: "Why use attestations instead of NFTs?",
    answer:
      "Attendance is a fact, not a collectible. An attestation is a better fit for proving that a wallet was present at a specific event and time.",
  },
  {
    question: "What stays private?",
    answer:
      "The attendee's exact coordinates stay on the device. The browser generates the proof locally, and the system verifies the result instead of storing raw location data.",
  },
  {
    question: "Why is World ID in the current flow?",
    answer:
      "World is the current proof-of-personhood layer in the hackathon build. It helps stop one person from claiming multiple times with different wallets for the same event.",
  },
  {
    question: "Could this work for classrooms or lecture halls?",
    answer:
      "Yes. The same venue-network and proximity model can be used for anti-fraud attendance in classrooms. The longer-term plan is to support school-issued identity or SSO for institutional mode.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="bg-[#f4f8ff] px-6 py-24 text-[#10233f]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="section-kicker">FAQ</p>
          <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-6xl">
            A few things people ask right away.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#52637e]">
            The product is simple on purpose, but the model behind it is different from a normal check-in tool.
          </p>
        </motion.div>

        <div className="mt-10 space-y-4">
          {faqs.map((item, index) => {
            const isOpen = index === openIndex;

            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-[1.8rem] border border-[#cfe1ff] bg-white/88 shadow-[0_18px_50px_rgba(37,99,235,0.08)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                >
                  <span className="text-lg font-semibold leading-7 text-[#10233f]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#2563eb] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-[#dbe8fb] px-6 py-5 text-sm leading-7 text-[#52637e] md:text-base">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
