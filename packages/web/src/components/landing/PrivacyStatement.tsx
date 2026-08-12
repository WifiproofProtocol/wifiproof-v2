export default function PrivacyStatement() {
  return (
    <section className="relative overflow-hidden bg-[var(--signal-coral)] px-5 py-24 text-[var(--signal-ink)] sm:px-8 lg:py-36">
      <div className="pointer-events-none absolute -right-24 -top-40 h-[32rem] w-[32rem] rounded-full border-[80px] border-[color:oklch(0.205_0.025_265_/_0.08)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.6fr_1.4fr]">
        <p className="text-sm font-semibold">Why WiFiProof</p>
        <blockquote className="display-type max-w-[19ch] text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.86] tracking-[-0.065em]">
          Why give away your identity just to prove you were there?
        </blockquote>
      </div>
    </section>
  );
}
