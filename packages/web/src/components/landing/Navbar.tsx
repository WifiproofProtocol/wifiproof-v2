"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import SignalMark from "./SignalMark";

const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#products", label: "Products" },
  { href: "#questions", label: "Questions" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--signal-line)] bg-[color:oklch(0.965_0.012_88_/_0.9)] backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--signal-cobalt)] focus-visible:ring-offset-3"
          aria-label="WiFiProof home"
        >
          <SignalMark className="h-8 w-8 text-[var(--signal-cobalt)] transition-transform duration-300 ease-out group-hover:rotate-6" />
          <span className="text-lg font-semibold tracking-[-0.035em]">WiFiProof</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex items-center gap-7 text-sm font-medium text-[var(--signal-muted)]">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-[var(--signal-ink)]">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/events" className="signal-button signal-button-secondary">
              Check in
            </Link>
            <Link href="/organizer" className="signal-button signal-button-primary">
              Create an event
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--signal-line)] bg-[var(--signal-paper)] text-[var(--signal-ink)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--signal-cobalt)] lg:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-[var(--signal-line)] bg-[var(--signal-canvas)] px-5 py-5 lg:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium hover:bg-[var(--signal-paper)]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/events" onClick={() => setIsOpen(false)} className="signal-button signal-button-secondary">
                  Check in
                </Link>
                <Link href="/organizer" onClick={() => setIsOpen(false)} className="signal-button signal-button-primary">
                  Create event
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
