"use client";
import { motion } from "framer-motion";
import { ArrowRight, QrCode } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center pt-20 overflow-hidden bg-[#02040A]">
      {/* Magical Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px] mix-blend-screen animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-800/40 rounded-full blur-[120px] mix-blend-screen animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-cyan-950/30 rounded-full blur-[100px] mix-blend-screen animate-pulse" />
      </div>

      <div className="container relative z-10 mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 mb-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-sm font-semibold text-cyan-300 tracking-wide">
              Enterprise-Grade Privacy
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 text-white tracking-tighter">
            Prove attendance without exposing <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-2xl">exact location.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-xl font-medium leading-relaxed">
            WiFiProof binds context-aware ZK proofs to Ethereum attestations.
            Verify physical presence definitively, while keeping your coordinates strictly on-device.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a href="/organizer" className="group relative w-full sm:w-auto">
              <div className="absolute -inset-0.5 bg-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative w-full px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                I'm an Organizer <ArrowRight className="w-5 h-5" />
              </div>
            </a>

            <div className="px-8 py-4 border border-cyan-900/50 bg-slate-900/50 backdrop-blur-md rounded-lg flex items-center justify-center gap-4 w-full sm:w-auto">
              <QrCode className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-white text-sm">I'm Attending</span>
                <span className="text-xs text-slate-400">Scan QR at event to check-in</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative w-full rounded-2xl border border-cyan-900/30 overflow-hidden shadow-[0_0_60px_rgba(0,229,255,0.1)] bg-[#02040A]"
        >
          <picture>
            <source media="(min-width: 1024px)" srcSet="/brand/hero-desktop.png" />
            <img 
              src="/brand/hero-mobile.png" 
              alt="WiFiProof Interface Preview" 
              className="w-full h-auto object-cover opacity-90"
            />
          </picture>
        </motion.div>
      </div>
    </section>
  );
}