"use client";
import { motion } from "framer-motion";

export default function Features() {
  return (
    <section id="features" className="py-24 relative bg-[#010614]">
      <div className="container px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Exposure Problem Section */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-cyan-900/30 shadow-2xl bg-[#02040A]">
              <img 
                src="/brand/exposure-visual.png" 
                alt="Public Exposure Problem Visual" 
                className="w-full h-auto object-cover opacity-90"
              />
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <h3 className="text-sm font-mono text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-500 rounded-full" />
                The Status Quo
              </h3>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Exposure Problem</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-[65ch]">
                Traditional public ledgers permanently broadcast your exact location history and behaviors to the world. A simple attendance claim shouldn't require compromising your operational security.
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h3 className="text-sm font-mono text-cyan-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                The Protocol
              </h3>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                How WiFiProof Works
              </h2>
              
              <div className="space-y-8 mt-8">
                <div className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)]">1</div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">Scan & Check-In</h4>
                    <p className="text-slate-400 text-base leading-relaxed">Connect to the venue subnet and scan the local QR code.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)]">2</div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">Local Proof Generation</h4>
                    <p className="text-slate-400 text-base leading-relaxed">Your device generates a ZK proof verifying proximity coordinates without broadcasting them.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)]">3</div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">Onchain Attestation</h4>
                    <p className="text-slate-400 text-base leading-relaxed">Mint a non-transferable EAS attestation that guarantees physical presence.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-cyan-900/30 shadow-2xl bg-[#02040A]">
              <img 
                src="/brand/how-it-works-visual.png" 
                alt="WiFiProof Technical Flow" 
                className="w-full h-auto object-cover opacity-90"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}