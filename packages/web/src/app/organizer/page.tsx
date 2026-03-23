const organizerNotes = [
  "Approved wallet required",
  "Venue Wi-Fi + location check",
  "Poster, details, and QR in one flow",
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

        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="section-kicker">For organizers</p>
            <h1 className="display-type mt-4 text-5xl leading-[0.96] tracking-[-0.04em] text-[#10233f] md:text-7xl">
              Create the event. Share the check-in.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#52637e] md:text-xl">
              WiFiProof keeps event setup tight: approved wallet, venue boundary,
              network check, and a shareable attendee page.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {organizerNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-[#cfe1ff] bg-white/86 px-4 py-2 text-sm font-medium text-[#31517f]"
                >
                  {note}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/organizer/setup"
                className="inline-flex items-center justify-center rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                Open organizer setup
              </a>
              <a
                href={contactHref}
                {...contactProps}
                className="inline-flex items-center justify-center rounded-full border border-[#93b7e8]/30 bg-white/82 px-6 py-3.5 text-sm font-medium text-[#10233f] transition hover:bg-white"
              >
                Request access
              </a>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#61728d]">
              Demo event creation is allowlisted. If your wallet is not approved yet,
              contact {contactLabel}.
            </p>
          </div>

          <div className="paper-panel rounded-[2rem] p-7 md:p-8">
            <p className="section-kicker">Flow</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] border border-[#d6e5fb] bg-[#f8fbff] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  01
                </p>
                <p className="mt-2 text-sm leading-7 text-[#425779] md:text-base">
                  Connect the organizer wallet and confirm it is approved.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#d6e5fb] bg-[#f8fbff] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  02
                </p>
                <p className="mt-2 text-sm leading-7 text-[#425779] md:text-base">
                  Add the event details, poster, location, and network prefix.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#d6e5fb] bg-[#f8fbff] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e7ca8]">
                  03
                </p>
                <p className="mt-2 text-sm leading-7 text-[#425779] md:text-base">
                  Publish the attendee page and display the generated QR on-site.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
