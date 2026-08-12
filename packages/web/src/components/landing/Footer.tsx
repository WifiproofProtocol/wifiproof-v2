import { Github } from "lucide-react";
import Link from "next/link";

import SignalMark from "./SignalMark";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="border-t border-[var(--signal-line)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.03em]">
          <SignalMark className="h-8 w-8 text-[var(--signal-cobalt)]" />
          WiFiProof
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--signal-muted)]">
          <Link href="/events" className="hover:text-[var(--signal-ink)]">Events</Link>
          <Link href="/school" className="hover:text-[var(--signal-ink)]">School</Link>
          <a href="https://x.com/WiFiProof" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--signal-ink)]">
            <span className="sr-only">WiFiProof on X</span><XIcon className="h-4 w-4" />
          </a>
          <a href="https://github.com/WifiproofProtocol" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--signal-ink)]">
            <span className="sr-only">WiFiProof on GitHub</span><Github className="h-4 w-4" />
          </a>
        </div>

        <p className="text-sm text-[var(--signal-muted)]">© 2026 WiFiProof Protocol</p>
      </div>
    </footer>
  );
}
