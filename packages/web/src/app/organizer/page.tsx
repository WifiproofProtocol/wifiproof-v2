import OrganizerClient from "./OrganizerClient";

const organizerBenefits = [
  {
    title: "Stronger attendance signal",
    description:
      "Tie the check-in to the venue itself instead of trusting a QR code alone.",
  },
  {
    title: "Less guest data",
    description:
      "Prove presence without asking for more personal data than the venue actually needs.",
  },
  {
    title: "Approved organizer access",
    description:
      "Official event creation stays tied to approved organizer wallets.",
  },
];

const launchSteps = [
  "Request access for the wallet you want to use.",
  "Set your venue, Wi-Fi subnet, and event window.",
  "Share the generated event page or QR code on-site.",
];

export default function OrganizerPage() {
  const organizerContactEmail = process.env.NEXT_PUBLIC_ORGANIZER_CONTACT_EMAIL?.trim();
  const contactHref = organizerContactEmail
    ? `mailto:${organizerContactEmail}?subject=WiFiProof organizer access`
    : "https://x.com/WiFiProof";
  const contactLabel = organizerContactEmail ?? "@WiFiProof on X";
  const contactProps = organizerContactEmail
    ? {}
    : { target: "_blank", rel: "noreferrer noopener" };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] pb-20 pt-24 text-[#10233f]">
      <section className="relative overflow-hidden px-6 pb-16 pt-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(96,165,250,0.18), transparent 28%), radial-gradient(circle at 85% 12%, rgba(37,99,235,0.14), transparent 24%), linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 44px 44px, 44px 44px",
          }}
        />

        <div className="relative mx-auto max-w-6xl space-y-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="section-kicker">Organizer guide</p>
              <h1 className="display-type mt-4 text-5xl leading-[0.96] tracking-[-0.04em] text-[#10233f] md:text-7xl">
                Run a privacy-first event with a simpler check-in story.
              </h1>
              <p className="mt-6 text-lg leading-8 text-[#52637e] md:text-xl">
                Start here if you want real proof of attendance without asking guests
                for a pile of unnecessary personal data.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href={contactHref}
                  {...contactProps}
                  className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                >
                  Request organizer access
                </a>
                <a
                  href="#organizer-setup"
                  className="inline-flex items-center justify-center rounded-full border border-[#93b7e8]/30 bg-white/82 px-6 py-3.5 text-sm font-medium text-[#10233f] transition hover:bg-white"
                >
                  Already approved? Continue to setup
                </a>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#61728d]">
                Organizer creation is allowlisted for the demo. If your wallet
                is not approved yet, contact {contactLabel} and we can enable it
                before the event goes live.
              </p>
            </div>

            <div className="paper-panel rounded-[2rem] p-7 md:p-8">
              <p className="section-kicker">How it works</p>
              <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#10233f]">
                Learn the flow first. Then move into setup.
              </h2>
              <p className="mt-4 text-base leading-8 text-[#52637e]">
                The guide is open, but final event creation is only authorized for approved wallets.
              </p>

              <div className="mt-6 space-y-4">
                {launchSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-[1.5rem] border border-[#d6e5fb] bg-[#f8fbff] px-4 py-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white">
                        0{index + 1}
                      </div>
                      <p className="text-sm leading-7 text-[#425779] md:text-base">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {organizerBenefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className={`rounded-[1.8rem] border p-6 shadow-[0_20px_50px_rgba(57,43,30,0.08)] ${
                  index === 1
                    ? "bg-[#0f2747] text-white border-white/8"
                    : "border-[#cfe1ff] bg-white/88 text-[#10233f]"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    index === 1 ? "text-[#cfe1ff]" : "text-[#2563eb]"
                  }`}
                >
                  Why it matters
                </p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight">
                  {benefit.title}
                </h3>
                <p
                  className={`mt-4 text-sm leading-7 md:text-base ${
                    index === 1 ? "text-[#d7e6ff]" : "text-[#52637e]"
                  }`}
                >
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="organizer-setup" className="px-6">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-[#cfe1ff] bg-white/86 p-4 shadow-[0_28px_80px_rgba(37,99,235,0.08)] md:p-6">
          <OrganizerClient />
        </div>
      </section>
    </main>
  );
}
