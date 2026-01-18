"use client";
import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Wifi } from "lucide-react";

const features = [
  {
    title: "Sybil Resistant",
    desc: "Gated by Coinbase KYC. One human, one proof. No bots, no farming.",
    icon: <ShieldCheck className="w-6 h-6 text-blue-500" />,
  },
  {
    title: "Zero-Knowledge",
    desc: "We verify you are within range, but we never see your actual coordinates.",
    icon: <MapPin className="w-6 h-6 text-purple-500" />,
  },
  {
    title: "Context-Aware",
    desc: "Proofs are cryptographically bound to the venue's specific WiFi subnet.",
    icon: <Wifi className="w-6 h-6 text-blue-400" />,
  },
];

export default function Features() {
  return (
    <section className="py-24 relative">
      <div className="container px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Three Layers of Trust
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            WiFiProof combines ZK cryptography, network verification, and
            identity proofs into a single attendance primitive.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative p-8 rounded-2xl glass-card transition-all duration-300 cursor-pointer"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Gradient border on hover */}
              <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-blue-500/30 transition-colors duration-300" />

              <motion.div
                className="relative z-10 w-12 h-12 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center mb-6 transition-colors duration-300"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {f.icon}
              </motion.div>
              <h3 className="relative z-10 text-xl font-bold text-white mb-3 group-hover:text-blue-100 transition-colors duration-300">
                {f.title}
              </h3>
              <p className="relative z-10 text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
