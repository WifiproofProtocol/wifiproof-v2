import { BadgeCheck, Fingerprint, Radio } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Enter the venue",
    copy: "Join the venue network and scan the live room signal.",
    Icon: Radio,
  },
  {
    number: "02",
    title: "Prove, privately",
    copy: "Your device proves proximity and humanity with World ID and Self, without publishing identity or coordinates.",
    Icon: Fingerprint,
  },
  {
    number: "03",
    title: "Keep the receipt",
    copy: "An anonymous attendance attestation settles on Base.",
    Icon: BadgeCheck,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-[var(--signal-line)] pb-10">
          <h2 className="display-type text-[clamp(2.75rem,6vw,5.75rem)] font-semibold leading-[0.9] tracking-[-0.06em]">
            How it works
          </h2>
        </div>

        <div className="divide-y divide-[var(--signal-line)]">
          {steps.map(({ number, title, copy, Icon }) => (
            <article
              key={number}
              className="grid gap-5 py-8 sm:grid-cols-[5rem_1fr_auto] sm:items-center lg:py-11"
            >
              <span className="text-sm font-semibold text-[var(--signal-cobalt)]">{number}</span>
              <div className="grid gap-2 lg:grid-cols-[0.75fr_1.25fr] lg:items-baseline">
                <h3 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h3>
                <p className="max-w-xl text-base leading-7 text-[var(--signal-muted)] sm:text-lg">{copy}</p>
              </div>
              <Icon className="hidden h-8 w-8 text-[var(--signal-coral)] sm:block" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
