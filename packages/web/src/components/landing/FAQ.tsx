"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Why not just use a QR code or a class link?",
    answer:
      "A QR code alone can be screenshotted, forwarded, or claimed remotely. WiFiProof adds venue network checks, local ZK proximity proofs, and verifiable records so the attendance signal is harder to fake.",
  },
  {
    question: "Which verification methods do you support?",
    answer:
      "Events can use World ID, Coinbase Verified, or Self Pass today. Schools can rely on existing student identity systems instead of separate proof-of-humanity checks.",
  },
  {
    question: "What kind of record does WiFiProof produce?",
    answer:
      "Events can use onchain attestations. Schools can keep attendance inside institutional systems. Custom teams can use onchain or offchain outputs.",
  },
  {
    question: "What stays private?",
    answer:
      "The attendee's exact coordinates stay on the device. The browser generates the proof locally, and the system verifies the result instead of storing raw location data.",
  },
  {
    question: "Could this work for classrooms or lecture halls?",
    answer:
      "Yes. Education is one strong use case, but not the only one. A lecturer or school can use WiFiProof to verify presence while keeping student identity in the institution's own systems.",
  },
  {
    question: "Is this only for Web3 users?",
    answer:
      "No. Web3 events can use onchain records and rewards. Schools and institutions can keep the attendance record inside their own systems.",
  },
  {
    question: "Is WiFiProof open to everyone right now?",
    answer:
      "Not yet. The current rollout is a mix of private beta, paid pilots, and guided deployments, while the public demo flow stays available for judges and testers.",
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
            Frequently asked questions.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#52637e]">
            Everything people usually want to know right away.
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
