"use client";
import { motion } from "framer-motion";

const techStack = [
  { name: "Noir", desc: "ZK Circuits" },
  { name: "Base", desc: "L2 Network" },
  { name: "EAS", desc: "Attestations" },
  { name: "Coinbase KYC", desc: "Identity" },
  { name: "Foundry", desc: "Contracts" },
];

export default function TechStack() {
  return (
    <section className="py-16 border-y border-white/5">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
        >
          {techStack.map((tech, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-bold text-white">{tech.name}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                {tech.desc}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
