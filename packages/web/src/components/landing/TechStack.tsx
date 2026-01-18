"use client";
import { motion } from "framer-motion";

const techStack = [
  { name: "Noir", desc: "ZK Circuits", color: "from-purple-500 to-purple-600" },
  { name: "Base", desc: "L2 Network", color: "from-blue-500 to-blue-600" },
  { name: "EAS", desc: "Attestations", color: "from-green-500 to-green-600" },
  {
    name: "Coinbase KYC",
    desc: "Identity",
    color: "from-blue-400 to-blue-500",
  },
  { name: "Foundry", desc: "Contracts", color: "from-orange-500 to-red-500" },
];

export default function TechStack() {
  return (
    <section className="py-20 border-y border-white/5 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-gray-500 text-sm uppercase tracking-widest mb-10"
        >
          Powered by
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-12"
        >
          {techStack.map((tech, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="group relative px-6 py-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
            >
              {/* Glow effect */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tech.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`}
              />

              <div className="relative z-10 text-center">
                <div
                  className={`text-lg font-bold bg-gradient-to-r ${tech.color} bg-clip-text text-transparent`}
                >
                  {tech.name}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                  {tech.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
