import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#02040A] px-4 pb-14 pt-20 text-slate-200">
      <div className="mx-auto w-full max-w-6xl">
        <EventsClient />
      </div>
    </main>
  );
}
