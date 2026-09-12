import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="px-5 pb-24 pt-4 sm:px-8 lg:pb-32">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-[var(--signal-cobalt)] px-6 py-14 text-[var(--signal-canvas)] sm:px-10 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[60px] border-[color:oklch(0.97_0.01_88_/_0.12)]" />
        <div className="relative flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display-type max-w-[13ch] text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.87] tracking-[-0.062em]">
            Make the room count.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/organizer" className="signal-button bg-[var(--signal-canvas)] text-[var(--signal-ink)] hover:brightness-95">
              Create an event <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/school" className="signal-button border border-[color:oklch(0.97_0.01_88_/_0.35)] text-[var(--signal-canvas)] hover:bg-[color:oklch(0.97_0.01_88_/_0.1)]">
              Explore School
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
