"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Why use WiFiProof?",
    answer: "Attendees keep their identity private and receive a verifiable receipt. Organizers get a stronger, auditable attendance count without collecting names, emails, or ID documents.",
  },
  {
    question: "Why not use a normal attendance platform?",
    answer: "Most attendance tools begin with a roster or profile. WiFiProof begins with the single fact an organizer needs: one eligible person checked in at this event.",
  },
  {
    question: "Can the venue network check be spoofed?",
    answer: "It can be relayed by a determined attacker, so it is never used alone. WiFiProof combines venue network egress, a short-lived room QR, private proximity, and a unique-human check. This deters ordinary remote claims but does not claim perfect physical-presence security.",
  },
  {
    question: "What if someone is near the venue but outside the room?",
    answer: "The rotating QR is the live room signal. It expires quickly, so being inside the location radius is not enough by itself. A forwarded QR is still possible, which is why the venue network and other signals are also required.",
  },
  {
    question: "Does WiFiProof know which Wi-Fi name I joined?",
    answer: "No. A normal browser cannot securely read or prove an SSID. WiFiProof checks that the request exits through a venue-approved network and describes that evidence as a venue network signal.",
  },
  {
    question: "Why use a zero-knowledge proof?",
    answer: "It lets the device prove that supplied coordinates fall inside the event radius without publishing those coordinates. Browser location can still be spoofed, so proximity is one signal rather than the whole claim.",
  },
  {
    question: "How do you know a unique person checked in, not only a device?",
    answer: "World ID supplies the unique-human proof for each event. An organizer may also require Self as an additional credential. The public attendance receipt does not reveal the person behind either proof.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="questions" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <h2 className="display-type max-w-[9ch] text-[clamp(3rem,6vw,5.8rem)] font-semibold leading-[0.88] tracking-[-0.06em]">
            Questions
          </h2>
        </div>

        <div className="divide-y divide-[var(--signal-line)] border-y border-[var(--signal-line)]">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--signal-cobalt)] focus-visible:ring-offset-3 sm:text-xl"
                >
                  {item.question}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--signal-cobalt)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-base leading-7 text-[var(--signal-muted)] sm:text-lg sm:leading-8">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
