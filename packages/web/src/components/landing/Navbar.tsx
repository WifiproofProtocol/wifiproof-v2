"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { href: "#story", label: "Story" },
  { href: "#how", label: "How it works" },
  { href: "#organizers", label: "For organizers" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#93b7e8]/25 bg-[#f4f8ff]/88 text-[#10233f] backdrop-blur-xl">
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
            <span className="text-xl font-semibold tracking-tight transition-colors group-hover:text-[#2563eb]">
              WiFiProof
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <div className="flex items-center gap-6 text-sm font-medium text-[#52637e]">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="transition-colors hover:text-[#10233f]">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/events"
                className="rounded-full border border-[#93b7e8]/30 bg-white/82 px-4 py-2 text-sm font-medium text-[#10233f] transition hover:border-[#5b96ea]/45 hover:bg-white"
              >
                Live events
              </Link>
              <Link
                href="/organizer"
                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                Organizer guide
              </Link>
            </div>
          </div>

          <button
            className="lg:hidden text-[#10233f] transition-colors hover:text-[#2563eb]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <motion.div
          initial={false}
          animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden border-t border-[#93b7e8]/25 lg:hidden"
        >
          <div className="space-y-4 px-2 py-6">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                initial={{ x: -20, opacity: 0 }}
                animate={isOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                transition={{ delay: i * 0.1 }}
                className="block rounded-2xl px-4 py-3 text-base font-medium text-[#49617f] transition hover:bg-white hover:text-[#10233f]"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </motion.a>
            ))}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Link
                href="/events"
                className="rounded-2xl border border-[#93b7e8]/30 bg-white/82 px-4 py-3 text-center text-sm font-medium text-[#10233f] transition hover:bg-white"
                onClick={() => setIsOpen(false)}
              >
                Live events
              </Link>
              <Link
                href="/organizer"
                className="rounded-2xl bg-[#2563eb] px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
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
