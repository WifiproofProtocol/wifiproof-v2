"use client";
import Link from "next/link";
import { Github } from "lucide-react";
import Image from "next/image";

// X Icon Component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="border-t border-[#2d261d]/10 bg-[#191612] py-12 text-[#f5efe6]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="text-center md:text-left">
            <Link href="/" className="mb-3 inline-flex items-center gap-2 justify-center md:justify-start">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                <Image
                  src="/WifiProofLogo.png"
                  alt="WiFiProof Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-white">WiFiProof</span>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-[#cdbfab]">
              Proof of presence for venues that want real attendance without
              turning guests into another data source.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#d7c9b8] md:justify-end">
            <Link href="/organizer" className="transition hover:text-white">
              Organizer guide
            </Link>
            <Link href="/events" className="transition hover:text-white">
              Live events
            </Link>
            <a
              href="https://x.com/WiFiProof"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              <span className="sr-only">X (Twitter)</span>
              <XIcon className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/WifiproofProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              <span className="sr-only">GitHub</span>
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 text-sm text-[#9e9384] md:flex-row">
          <p>© 2026 WiFiProof Protocol. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition hover:text-white">Privacy Policy</a>
            <a href="#" className="transition hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
