import OrganizerClient from "../OrganizerClient";

export default function OrganizerSetupPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] pb-20 pt-24 text-[#10233f]">
      <section className="px-6">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-[#cfe1ff] bg-white/86 p-4 shadow-[0_28px_80px_rgba(37,99,235,0.08)] md:p-6">
          <OrganizerClient />
        </div>
      </section>
    </main>
  );
}
