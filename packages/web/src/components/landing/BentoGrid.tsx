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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-8 rounded-2xl hover:border-white/20 transition-all ${card.className}`}
            >
              <div className="mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-gray-400">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
