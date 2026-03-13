"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { href: "#problem", label: "Why it exists" },
  { href: "#how", label: "How it works" },
  { href: "#organizers", label: "For organizers" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#2d261d]/10 bg-[#f3ede4]/85 text-[#1f1b17] backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/WifiProofLogo.png"
                alt="WiFiProof Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight transition-colors group-hover:text-[#5f6f52]">
              WiFiProof
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <div className="flex items-center gap-6 text-sm font-medium text-[#5d554d]">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="transition-colors hover:text-[#1f1b17]">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/events"
                className="rounded-full border border-[#2d261d]/12 bg-white/55 px-4 py-2 text-sm font-medium text-[#1f1b17] transition hover:bg-white/80"
              >
                Live events
              </Link>
              <Link
                href="/organizer"
                className="rounded-full bg-[#201b18] px-4 py-2 text-sm font-medium text-[#f5efe6] transition hover:bg-[#362e27]"
              >
                Organizer guide
              </Link>
            </div>
          </div>

          <button
            className="lg:hidden text-[#1f1b17] transition-colors hover:text-[#5f6f52]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <motion.div
          initial={false}
          animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden border-t border-[#2d261d]/10 lg:hidden"
        >
          <div className="space-y-4 px-2 py-6">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                initial={{ x: -20, opacity: 0 }}
                animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                transition={{ delay: i * 0.1 }}
                className="block rounded-2xl px-4 py-3 text-base font-medium text-[#4d463e] transition hover:bg-white/55 hover:text-[#1f1b17]"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </motion.a>
            ))}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Link
                href="/events"
                className="rounded-2xl border border-[#2d261d]/12 bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#1f1b17] transition hover:bg-white/80"
                onClick={() => setIsOpen(false)}
              >
                Live events
              </Link>
              <Link
                href="/organizer"
                className="rounded-2xl bg-[#201b18] px-4 py-3 text-center text-sm font-medium text-[#f5efe6] transition hover:bg-[#362e27]"
                onClick={() => setIsOpen(false)}
              >
                Organizer guide
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
