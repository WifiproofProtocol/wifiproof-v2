import ProductShell from "@/components/product/ProductShell";

import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <ProductShell current="events">
      <EventsClient />
    </ProductShell>
  );
}
