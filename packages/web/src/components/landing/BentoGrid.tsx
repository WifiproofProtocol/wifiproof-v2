"use client";
import { motion } from "framer-motion";
import { Globe, Shield, Zap, Users } from "lucide-react";

const cards = [
  {
    title: "Conferences & Events",
    desc: "Issue non-transferable attestations that actually require physical attendance. No more QR code farming from Twitter.",
    icon: <Users className="w-6 h-6 text-blue-500" />,
    className: "md:col-span-2",
  },
  {
    title: "Sybil Guard",
    desc: "Gated by Coinbase KYC for 1-person-1-proof integrity.",
    icon: <Shield className="w-6 h-6 text-purple-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Instant Verification",
    desc: "Proofs verified in seconds on Base L2.",
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Privacy Protocol",
    desc: "Your coordinates never leave your device. The protocol only sees a 'True/False' verification of your proximity.",
    icon: <Globe className="w-6 h-6 text-green-500" />,
    className: "md:col-span-2",
  },
];

export default function BentoGrid() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Built for the Onchain Future
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From conferences to retail, WiFiProof enables privacy-preserving
            proof of presence for any venue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: i * 0.15,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileHover={{ y: -5, scale: 1.01 }}
              className={`group relative glass-card p-8 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${card.className}`}
            >
              {/* Animated gradient background on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
              {/* Shine effect on scroll */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
                whileInView={{ translateX: ["100%", "-100%"] }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.8 }}
              />
              {/* Border glow */}
              <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-blue-500/20 transition-colors duration-300" />

              <motion.div
                className="relative z-10 mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {card.icon}
              </motion.div>
              <h3 className="relative z-10 text-xl font-bold mb-2 group-hover:text-blue-100 transition-colors duration-300">
                {card.title}
              </h3>
              <p className="relative z-10 text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
