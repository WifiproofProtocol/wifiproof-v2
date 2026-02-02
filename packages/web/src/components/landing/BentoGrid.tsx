"use client";
import { motion } from "framer-motion";
import { Globe, Shield, Zap, Users } from "lucide-react";

const cards = [
  {
    title: "Conferences & Events",
    desc: "Issue non-transferable attestations that actually require physical attendance. No more QR code farming from Twitter.",
    icon: <Users className="w-8 h-8 text-white" />,
    gradient: "from-blue-500 to-cyan-400",
    className: "md:col-span-2",
  },
  {
    title: "Sybil Guard",
    desc: "Gated by Coinbase KYC for 1-person-1-proof integrity.",
    icon: <Shield className="w-8 h-8 text-white" />,
    gradient: "from-purple-500 to-pink-500",
    className: "md:col-span-1",
  },
  {
    title: "Instant Verification",
    desc: "Proofs verified in seconds on Base L2.",
    icon: <Zap className="w-8 h-8 text-white" />,
    gradient: "from-yellow-400 to-orange-500",
    className: "md:col-span-1",
  },
  {
    title: "Privacy Protocol",
    desc: "Your coordinates never leave your device. The protocol only sees a 'True/False' verification of your proximity.",
    icon: <Globe className="w-8 h-8 text-white" />,
    gradient: "from-green-400 to-emerald-600",
    className: "md:col-span-2",
  },
];

export default function BentoGrid() {
  return (
    <section className="py-24 relative bg-[#020412]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Onchain Future</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From conferences to retail, WiFiProof enables privacy-preserving
            proof of presence for any venue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className={`group relative glass-panel p-8 rounded-3xl overflow-hidden ${card.className}`}
            >
              {/* Animated Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

              <div className="relative z-10 h-full flex flex-col">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>

                <h3 className="text-2xl font-bold text-white mb-3 leading-tight">
                  {card.title}
                </h3>

                <p className="text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors">
                  {card.desc}
                </p>
              </div>

              {/* Decorative Blur */}
              <div className={`absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
