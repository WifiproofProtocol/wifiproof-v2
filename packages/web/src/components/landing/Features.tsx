"use client";
import { motion } from "framer-motion";

const oldWay = [
  "Forwarded links, screenshots, or paper check-ins",
  "Too much personal data collected for a simple presence check",
  "One rigid flow for users with very different needs",
];

const newWay = [
  "Venue Wi-Fi as a real on-site signal",
  "Local proof generation that keeps raw location private",
  "Different deployment modes for Web3 events and institutions",
];

const proofSteps: [string, string][] = [
  ["Choose access", "The live app is wallet-based today, while institutional deployments can be tailored around the user's existing access system."],
  ["Verify context", "Venue Wi-Fi and network checks confirm the request is coming from the right environment."],
  ["Generate proof", "Location proof generation happens locally so exact coordinates are not turned into a surveillance feed."],
  ["Write the record", "Depending on the use case, the result can become an onchain attestation or another institution-facing attendance record."],
];

export default function Features() {
  return (
    <section id="problem" className="bg-[#f4f8ff] px-6 py-24 text-[#10233f]">
      <div className="mx-auto max-w-6xl space-y-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="section-kicker">The platform</p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] text-[#10233f] md:text-6xl">
              One verification foundation, many use cases.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#52637e]">
              The core job is simple: confirm that someone was physically there. WiFiProof
              does that in a privacy-preserving way, then lets the product layer adapt to the
              user, whether that is a Web3 event, a university, or another live program.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="paper-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                Typical attendance stack
              </p>
              <div className="mt-5 space-y-3">
                {oldWay.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#d6e5fb] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[#3d5478]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="ink-panel rounded-[2rem] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfe1ff]">
                WiFiProof
              </p>
              <div className="mt-5 space-y-3">
                {newWay.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-[#e3edff]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          id="how"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2.5rem] border border-[#cfe1ff] bg-white/86 px-6 py-10 text-[#10233f] shadow-[0_24px_80px_rgba(37,99,235,0.08)] md:px-10 md:py-12"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">How it works</p>
              <h3 className="display-type mt-3 text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
                Four steps, one stronger attendance signal.
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#52637e] md:text-base">
              This is the core platform flow. The UI around it can vary by audience.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {proofSteps.map(([title, description], index) => (
              <div
                key={title}
                className="rounded-[2rem] border border-[#d6e5fb] bg-[#f8fbff] p-6"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                  0{index + 1}
                </p>
                <h4 className="mt-4 text-2xl font-semibold text-[#10233f]">{title}</h4>
                <p className="mt-4 text-sm leading-7 text-[#52637e] md:text-base">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
