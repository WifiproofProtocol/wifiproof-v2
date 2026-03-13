"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const techStack = [
  { name: "Noir", desc: "On-device proving", logo: "/brand/noirlang.png" },
  { name: "Base", desc: "Settlement layer", logo: "/brand/logo-base.svg" },
  { name: "EAS", desc: "Attendance attestations", logo: "/brand/eas-attestation.png" },
  { name: "Human checks", desc: "Sybil resistance", logo: null },
  { name: "Foundry", desc: "Contract tooling", logo: null },
];

export default function TechStack() {
  return (
    <section className="border-y border-[#2d261d]/10 bg-[#e8ddcd]/70 px-6 py-20 text-[#1f1b17]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="section-kicker">Under the hood</p>
            <h2 className="display-type mt-4 text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
              Serious infrastructure underneath a simple guest experience.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#5f564d] md:text-base">
            The story should feel human. The rails still matter: local proving,
            an onchain settlement layer, and non-transferable attestations that
            organizers can build on later.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="rounded-[1.5rem] border border-[#2d261d]/10 bg-white/70 px-5 py-6 transition-all duration-300"
            >
              <div className="flex h-full flex-col items-center gap-3 text-center">
                {tech.logo ? (
                  <Image
                    src={tech.logo}
                    alt={tech.name}
                    width={112}
                    height={28}
                    className="h-7 w-auto object-contain opacity-90"
                  />
                ) : (
                  <div className="text-lg font-semibold text-[#1f1b17]">
                    {tech.name}
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6459]">
                  {tech.name}
                </div>
                <div className="text-sm leading-6 text-[#5f564d]">{tech.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
