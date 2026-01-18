"use client";
import { motion } from "framer-motion";
import { Github } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(#1e1e1e 1px, transparent 1px), linear-gradient(90deg, #1e1e1e 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container relative z-10 mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Building on Base
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Proof of Presence. <br />
            <span className="gradient-text">Zero Leakage.</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-xl">
            WiFiProof generates cryptographic attestations that you were at a
            specific location, using the venue&apos;s WiFi as a private network
            primitive. No tracking. No GPS spoofing. Just Math.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="#waitlist" className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-500 animate-gradient-x" />
              <div className="relative px-8 py-4 bg-[#0a0a0a] text-white rounded-lg font-bold transition-all">
                Join Waitlist
              </div>
            </a>
            <a
              href="https://github.com/AztecProtocol/wifiproof-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 glass-card text-white rounded-lg font-bold hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>
        </motion.div>

        {/* ZK Visualizer Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative lg:block hidden"
        >
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex gap-2">
                <motion.div
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <motion.div
                  className="w-3 h-3 rounded-full bg-yellow-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                />
                <motion.div
                  className="w-3 h-3 rounded-full bg-green-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
                />
              </div>
              <motion.div
                className="text-xs font-mono text-gray-500 tracking-widest"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                NOIR_CIRCUIT_V2
              </motion.div>
            </div>

            <div className="space-y-4 font-mono text-sm relative z-10">
              <motion.div
                className="flex justify-between text-blue-400"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span>Inputs:</span>
                <span>[lat, lon, threshold_sq]</span>
              </motion.div>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="text-gray-500 py-4 space-y-1">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {`> Initializing Barretenberg...`}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  {`> Constraint System: 108 ACIR opcodes`}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  {`> Generating Witness...`}
                </motion.div>
              </div>

              {/* Animated Proof Bar */}
              <div className="relative h-12 bg-white/5 rounded-lg border border-white/10 flex items-center px-4 overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
                <span className="relative z-10 text-blue-400 animate-pulse">
                  PROVING PHYSICAL PRESENCE...
                </span>
              </div>

              <motion.div
                className="text-green-500 space-y-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    ✓
                  </motion.span>
                  {`Proof Generated: 0x72a...f92`}
                </div>
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                  >
                    ✓
                  </motion.span>
                  {`Verifying on Base... SUCCESS`}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
