import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f8ff] px-4 pb-20 pt-24 text-[#10233f]">
      <div className="mx-auto w-full max-w-6xl">
        <EventsClient />
      </div>
    </main>
  );
}
