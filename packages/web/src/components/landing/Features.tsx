"use client";
import { motion } from "framer-motion";

const dataRequests = [
  "Email address",
  "Phone number",
  "Full legal name",
  "Government ID",
  "A public trail of where you went",
];

const proofSteps = [
  {
    number: "01",
    title: "Join the venue network",
    description:
      "The guest connects to the venue Wi-Fi and opens the check-in page that belongs to that specific event.",
  },
  {
    number: "02",
    title: "Generate proof locally",
    description:
      "Their device proves proximity to the venue on-device, so the exact coordinates never have to leave the phone.",
  },
  {
    number: "03",
    title: "Issue attendance without oversharing",
    description:
      "The event mints a non-transferable proof of attendance instead of building a dossier on the guest.",
  },
];

export default function Features() {
  return (
    <section id="problem" className="bg-[#f3ede4] px-6 py-24 text-[#1f1b17]">
      <div className="mx-auto max-w-6xl space-y-20">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="section-kicker">The check-in problem</p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] text-[#1f1b17] md:text-6xl">
              The only question a venue really needs answered is: were you here?
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#5f564d]">
              Most check-in flows collect identity by default because that is the
              easiest product pattern on the web. WiFiProof starts from the
              opposite premise: attendance should be verifiable without turning
              guests into a row in a marketing database.
            </p>

            <blockquote className="paper-panel mt-8 rounded-[2rem] p-6 text-lg leading-8 text-[#372f28]">
              “Presence is the thing being proven. Everything else is optional,
              and most of it should stay private.”
            </blockquote>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {dataRequests.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-[#2d261d]/10 bg-white/65 px-5 py-4"
              >
                <span className="font-medium text-[#2b241f]">{item}</span>
                <span className="rounded-full bg-[#efe3d2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8c5a36]">
                  Commonly requested
                </span>
              </div>
            ))}
            <div className="ink-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
                WiFiProof instead
              </p>
              <p className="mt-4 text-lg leading-8 text-[#eee2d5]">
                It reduces the claim to a single statement: this wallet was
                physically present inside the event boundary during the event
                window.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          id="how"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2.5rem] bg-[#1f1b18] px-6 py-10 text-[#f5efe6] md:px-10 md:py-12"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
                How it works
              </p>
              <h3 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
                Venue Wi-Fi becomes part of the proof, not just the password
                everyone keeps asking for.
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#d7c7b6] md:text-base">
              The experience stays simple for guests, but the claim is much
              harder to fake than a QR code shared in a group chat.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {proofSteps.map((step) => (
              <div
                key={step.number}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ccb9a2]">
                  {step.number}
                </p>
                <h4 className="mt-4 text-2xl font-semibold text-white">{step.title}</h4>
                <p className="mt-4 text-sm leading-7 text-[#ddd0c2] md:text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
