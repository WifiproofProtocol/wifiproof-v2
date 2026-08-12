import Link from "next/link";

import ProductShell from "@/components/product/ProductShell";

import OrganizerDashboardClient from "./OrganizerDashboardClient";

export default function OrganizerPage() {
  return (
    <ProductShell current="organizer">
      <section className="mb-12 flex flex-col gap-7 border-b border-[var(--signal-line)] pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="product-label">Organizer</p>
          <h1 className="product-page-title">Your events</h1>
        </div>
        <Link href="/organizer/setup" className="signal-button signal-button-primary px-6 py-3.5">
          Create an event
        </Link>
      </section>

      <OrganizerDashboardClient />
    </ProductShell>
  );
}
