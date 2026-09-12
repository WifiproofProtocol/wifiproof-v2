"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import SignalMark from "@/components/landing/SignalMark";

const links = [
  { href: "/events", label: "Events" },
  { href: "/organizer", label: "Organizer" },
  { href: "/school", label: "School" },
];

export default function ProductHeader({ current }: { current?: "events" | "organizer" | "school" }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="product-header">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="product-brand" aria-label="WiFiProof home">
          <SignalMark className="h-8 w-8 text-[var(--signal-cobalt)]" />
          <span>WiFiProof</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Product navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current === link.label.toLowerCase() ? "page" : undefined}
              className={`product-nav-link ${current === link.label.toLowerCase() ? "product-nav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="product-icon-button md:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-[var(--signal-line)] px-5 py-3 md:hidden" aria-label="Mobile product navigation">
          <div className="mx-auto grid max-w-7xl gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[var(--signal-paper)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
