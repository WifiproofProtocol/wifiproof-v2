"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email, created_at: new Date().toISOString() }]);

      if (error) {
        if (error.code === "23505") {
          setMessage("You're already on the waitlist!");
        } else {
          setMessage("Something went wrong. Please try again.");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto glass-card p-12 rounded-[2rem] border-white/10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Be the first to prove <br />
              <span className="gradient-text">you were there.</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10">
              We are currently in private beta for event organizers. Join the
              waitlist for early access to the V2 mainnet launch.
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
              <div className="relative group">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "success" || status === "loading"}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-gray-600 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "success" || status === "loading"}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center gap-2 disabled:bg-gray-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Join</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {status === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 mt-4 text-green-400 font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>You&apos;re in. Stay tuned for the ZK revolution.</span>
                  </motion.div>
                )}
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-red-400 text-sm"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
