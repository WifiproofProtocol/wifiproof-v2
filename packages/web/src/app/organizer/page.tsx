import OrganizerClient from "./OrganizerClient";

export default function OrganizerPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#02040A] pb-12 pt-24 text-slate-200">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage: "url('/brand/organizer-form-texture.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#02040A]/50 to-[#02040A]" />

      <div className="container relative z-10 mx-auto px-4">
        <OrganizerClient />
      </div>
    </main>
  );
}
