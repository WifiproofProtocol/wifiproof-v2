import OrganizerClient from "./OrganizerClient";

const organizerBenefits = [
  {
    title: "Prove real attendance",
    description:
      "Anchor the claim to the venue itself instead of trusting a QR code that can be forwarded around.",
  },
  {
    title: "Respect guest privacy",
    description:
      "The flow proves presence without making guests hand over more personal data than the venue actually needs.",
  },
  {
    title: "Keep organizer control",
    description:
      "Event creation is allowlisted so official check-ins stay tied to approved organizer wallets.",
  },
];

const launchSteps = [
  "Request organizer access for the wallet you want to use.",
  "Set your venue coordinates, Wi-Fi subnet, and event window.",
  "Display the generated event page or QR code at the venue.",
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#efe7da] pb-20 pt-24 text-[#1f1b17]">
      <section className="relative overflow-hidden px-6 pb-16 pt-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(171,108,66,0.16), transparent 28%), radial-gradient(circle at 85% 12%, rgba(95,111,82,0.16), transparent 24%), linear-gradient(rgba(31,27,23,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(31,27,23,0.035) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 44px 44px, 44px 44px",
          }}
        />

        <div className="relative mx-auto max-w-6xl space-y-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="section-kicker">Organizer guide</p>
              <h1 className="display-type mt-4 text-5xl leading-[0.96] tracking-[-0.04em] text-[#1f1b17] md:text-7xl">
                Run a privacy-first event without turning check-in into
                surveillance.
              </h1>
              <p className="mt-6 text-lg leading-8 text-[#5f564d] md:text-xl">
                WiFiProof is strongest when organizers lead with a better story:
                prove that someone showed up, without asking for all the extra
                identity data the web has taught people to expect.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href={contactHref}
                  {...contactProps}
                  className="inline-flex items-center justify-center rounded-full bg-[#201b18] px-6 py-3.5 text-sm font-medium text-[#f5efe6] transition hover:bg-[#362e27]"
                >
                  Request organizer access
                </a>
                <a
                  href="#organizer-setup"
                  className="inline-flex items-center justify-center rounded-full border border-[#2d261d]/12 bg-white/55 px-6 py-3.5 text-sm font-medium text-[#1f1b17] transition hover:bg-white/80"
                >
                  Already approved? Continue to setup
                </a>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#6b6258]">
                Organizer creation is allowlisted for the demo. If your wallet
                is not approved yet, contact {contactLabel} and we can enable it
                before the event goes live.
              </p>
            </div>

            <div className="paper-panel rounded-[2rem] p-7 md:p-8">
              <p className="section-kicker">How access works</p>
              <h2 className="display-type mt-3 text-3xl leading-tight tracking-[-0.03em] text-[#1f1b17]">
                The backend checks organizer approval before it authorizes event
                creation.
              </h2>
              <p className="mt-4 text-base leading-8 text-[#5b5249]">
                That means the guide is open to everyone, but the final event
                creation signature only comes through for approved wallets.
              </p>

              <div className="mt-6 space-y-4">
                {launchSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-[1.5rem] border border-[#2d261d]/8 bg-[#fbf7f1] px-4 py-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#201b18] text-sm font-semibold text-[#f5efe6]">
                        0{index + 1}
                      </div>
                      <p className="text-sm leading-7 text-[#3d352d] md:text-base">{step}</p>
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
                    ? "bg-[#1f1b18] text-[#f5efe6] border-white/8"
                    : "border-[#2d261d]/10 bg-white/70 text-[#1f1b17]"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    index === 1 ? "text-[#ccb9a2]" : "text-[#6c6459]"
                  }`}
                >
                  Why it matters
                </p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight">
                  {benefit.title}
                </h3>
                <p
                  className={`mt-4 text-sm leading-7 md:text-base ${
                    index === 1 ? "text-[#ddd0c2]" : "text-[#5b5249]"
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
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-[#2d261d]/10 bg-white/55 p-4 shadow-[0_28px_80px_rgba(57,43,30,0.08)] md:p-6">
          <OrganizerClient />
        </div>
      </section>
    </main>
  );
}
