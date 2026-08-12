import { ArrowUpRight, GraduationCap, RadioTower } from "lucide-react";
import Link from "next/link";

export default function Products() {
  return (
    <section id="products" className="bg-[var(--signal-ink)] px-5 py-24 text-[var(--signal-canvas)] sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-[color:oklch(0.96_0.01_88_/_0.16)] pb-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display-type max-w-[12ch] text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.84] tracking-[-0.065em]">
            Prove the room you are in.
          </h2>
        </div>

        <div className="grid gap-px bg-[color:oklch(0.96_0.01_88_/_0.16)] lg:grid-cols-[1.18fr_0.82fr]">
          <div className="bg-[var(--signal-ink)] py-10 lg:pr-12">
            <RadioTower className="h-9 w-9 text-[var(--signal-coral)]" />
            <h3 className="mt-16 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Event check-in</h3>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[color:oklch(0.82_0.02_88)]">
              Create a venue-bound check-in and issue anonymous, verifiable receipts.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/organizer" className="signal-button bg-[var(--signal-coral)] text-[var(--signal-ink)] hover:brightness-95">
                Create an event <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/events" className="signal-button border border-[color:oklch(0.96_0.01_88_/_0.22)] text-[var(--signal-canvas)] hover:bg-[color:oklch(0.96_0.01_88_/_0.08)]">
                Find an event
              </Link>
            </div>
          </div>

          <div className="bg-[var(--signal-ink)] py-10 lg:pl-12">
            <GraduationCap className="h-9 w-9 text-[var(--signal-mint)]" />
            <h3 className="mt-16 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">School</h3>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[color:oklch(0.82_0.02_88)]">
              Role-protected class attendance that leaves identity with the institution.
            </p>
            <Link href="/school" className="signal-button mt-10 border border-[color:oklch(0.96_0.01_88_/_0.22)] text-[var(--signal-canvas)] hover:bg-[color:oklch(0.96_0.01_88_/_0.08)]">
              Open School <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
