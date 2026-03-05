"use client";
import { motion } from "framer-motion";
import { ArrowRight, QrCode } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#010614]">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-[#02040A] border border-cyan-900/30 p-12 md:p-16 rounded-[2rem] text-center shadow-[0_0_80px_rgba(0,229,255,0.05)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white tracking-tighter">
              Ready to secure <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">your next event?</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop relying on easily forged sign-in sheets and remote QR code farming. Guarantee physical presence starting today.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a href="/organizer" className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                I'm an Organizer <ArrowRight className="w-5 h-5" />
              </a>

              <div className="w-full sm:w-auto px-8 py-4 border border-cyan-900/50 bg-slate-900/50 backdrop-blur-md rounded-lg flex items-center justify-center gap-4">
                <QrCode className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white text-sm">I'm Attending</span>
                  <span className="text-xs text-slate-400">Scan QR at the venue</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}