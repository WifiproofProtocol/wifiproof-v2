"use client";
import { motion } from "framer-motion";
import { ShieldCheck, UserX, Ghost, MapPin, Ticket } from "lucide-react";

const problems = [
  {
    title: "The POAP Problem",
    items: [
      { text: "Easily transferable (Alice → Bob)", icon: <UserX className="w-4 h-4" /> },
      { text: "Remote farming via Discord links", icon: <Ghost className="w-4 h-4" /> },
      { text: "Sign-in sheets are forged", icon: <ShieldCheck className="w-4 h-4 opacity-50" /> },
    ]
  },
  {
    title: "The Ticket Problem",
    items: [
      { text: "Tickets can be resold", icon: <Ticket className="w-4 h-4" /> },
      { text: "No proof of physical presence", icon: <MapPin className="w-4 h-4 opacity-50" /> },
      { text: "Screenshots can be shared", icon: <Ghost className="w-4 h-4" /> },
    ]
  }
];

export default function Features() {
  return (
    <section className="py-24 relative bg-[#020202]">
      <div className="container px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-8 text-center text-white">
            Current attendance systems are broken.
          </h2>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            {/* The Problem Side */}
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-2xl">
              <h3 className="text-xl font-mono text-red-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                System_Failure: The Status Quo
              </h3>
              <div className="space-y-6">
                {problems.map((group, i) => (
                  <div key={i}>
                    <h4 className="text-white font-bold mb-3">{group.title}</h4>
                    <ul className="space-y-2 text-gray-400 text-sm font-mono">
                      {group.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-3">
                          <span className="text-red-500/50">×</span>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* The Solution Side */}
            <div className="bg-green-500/5 border border-green-500/20 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />

              <h3 className="text-xl font-mono text-green-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                System_Patch: WiFiProof V2
              </h3>

              <div className="space-y-8">
                <div>
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="text-green-500">✓</span> Soulbound & Non-Transferable
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We use Ethereum Attestation Service (EAS) to bind the proof to your identity.
                    It cannot be sent, sold, or farmed remotely.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="text-green-500">✓</span> Context-Bound Verification
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Requires <span className="text-white">Active WiFi Connection</span> + <span className="text-white">GPS Proximity</span>.
                    You must physically be on the venue's subnet to generate the proof.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="text-green-500">✓</span> Privacy First
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    ZK circuits verify you are within range without ever revealing your exact location.
                    No public ledger doxxing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
