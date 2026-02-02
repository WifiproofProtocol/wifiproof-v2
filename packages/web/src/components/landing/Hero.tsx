"use client";
import { motion } from "framer-motion";
import { Github, Play } from "lucide-react";
import Particles from "./Particles";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#020412]">
      {/* Magical Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" />
      </div>

      <div className="container relative z-10 mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 mb-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span className="text-sm font-semibold text-blue-300 tracking-wide">
              The Protocol for Presence
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6">
            "What's the <br />
            <span className="gradient-text drop-shadow-2xl">WiFi Password?"</span>
          </h1>

          <p className="text-gray-300/80 text-xl md:text-2xl mb-10 max-w-xl font-medium leading-relaxed">
            At every event, everyone asks for the WiFi. <br />
            It's the one universal proof that you're actually there.
            <br />
            <span className="text-blue-300">WiFiProof turns this simple question into a soulbound attendance credential.</span>
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="#waitlist" className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-500 animate-gradient-x" />
              <div className="relative px-8 py-4 bg-[#0a0a0a] text-white rounded-lg font-bold text-lg transition-all flex items-center gap-2">
                Start Proving <Play className="w-4 h-4 fill-current" />
              </div>
            </a>

            <a
              href="https://github.com/WifiproofProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 glass-panel text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              Our Story
            </a>
          </div>
        </motion.div>

        {/* Crazy Animation / Visualizer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative lg:block hidden h-[600px] w-full"
        >
          {/* Abstract Phone/Device Representation */}
          <div className="relative w-full h-full flex items-center justify-center">

            {/* Spinning Rings */}
            <div className="absolute w-[500px] h-[500px] rounded-full border border-white/5 animate-[spin_20s_linear_infinite]" />
            <div className="absolute w-[400px] h-[400px] rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute w-[300px] h-[300px] rounded-full border border-blue-500/20 animate-[spin_10s_linear_infinite]" />

            {/* Floating Cards (Glassmorphism) */}
            <motion.div
              animate={{ y: [-15, 15, -15] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              className="absolute z-20 glass-panel p-6 rounded-2xl w-64 top-[20%] right-[10%]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" />
                <div>
                  <div className="h-2 w-20 bg-white/20 rounded mb-1" />
                  <div className="h-2 w-12 bg-white/10 rounded" />
                </div>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-green-400" />
              </div>
              <div className="mt-2 text-xs text-green-300 font-mono">Verifying Location...</div>
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 7, ease: "easeInOut", repeat: Infinity, delay: 1 }}
              className="absolute z-10 glass-panel p-6 rounded-2xl w-72 bottom-[20%] left-[5%]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <div className="text-sm font-bold text-white">ETH Global Guest</div>
              </div>
              <div className="py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono text-center">
                ✓ Connected to Subnet
              </div>
            </motion.div>

            {/* Center Glowing Core */}
            <div className="relative z-30 w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.5)] animate-[pulse_4s_ease-in-out_infinite]">
              <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
