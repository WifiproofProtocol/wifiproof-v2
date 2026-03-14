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
    <section className="border-y border-[#cfe1ff] bg-[#edf5ff] px-6 py-20 text-[#10233f]">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="section-kicker">Under the hood</p>
          <h2 className="display-type mt-4 max-w-3xl text-3xl leading-tight tracking-[-0.03em] md:text-4xl">
            Simple on the surface, serious underneath.
          </h2>
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
              className="rounded-[1.5rem] border border-[#cfe1ff] bg-white/90 px-5 py-6 transition-all duration-300"
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
                  <div className="text-lg font-semibold text-[#10233f]">
                    {tech.name}
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  {tech.name}
                </div>
                <div className="text-sm leading-6 text-[#52637e]">{tech.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
