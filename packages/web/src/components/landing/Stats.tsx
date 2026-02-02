"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

const stats = [
  { value: 108, suffix: "", label: "ACIR_OPCODES", prefix: "" },
  { value: 100, suffix: "%", label: "VERIFICATION_RATE", prefix: "" },
  { value: 0, suffix: "", label: "DATA_LEAKS", prefix: "" },
  { value: 1, suffix: "", label: "PROOF_PER_PERSON", prefix: "" },
];

function AnimatedNumber({
  value,
  suffix,
  prefix,
}: {
  value: number;
  suffix: string;
  prefix: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate(count, value, { duration: 2, ease: "circOut" });
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [count, value]);

  return (
    <span ref={ref} className="tabular-nums tracking-tighter">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section className="py-24 relative border-y border-white/5 bg-[#050505]">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-[#050505] p-8 group hover:bg-[#0a0a0a] transition-colors relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl md:text-5xl font-mono font-bold text-white mb-2">
                  <AnimatedNumber
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                  />
                </div>
                <div className="text-gray-500 font-mono text-xs uppercase tracking-widest">
                  {stat.label}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between font-mono text-[10px] text-gray-600 uppercase">
          <span>SystemStatus: ORBITAL</span>
          <span>Uptime: 99.99%</span>
        </div>
      </div>
    </section>
  );
}
