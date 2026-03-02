import EventClient from "./EventClient";

export default function EventPage({ params }: { params: { eventId: string } }) {
  return (
    <main className="min-h-screen px-6 py-10">
      <EventClient eventId={params.eventId} />
    </main>
  );
}
