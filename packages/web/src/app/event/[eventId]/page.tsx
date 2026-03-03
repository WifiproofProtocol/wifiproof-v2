import EventClient from "./EventClient";

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <main className="min-h-screen px-6 py-10">
      <EventClient eventId={eventId} />
    </main>
  );
}
