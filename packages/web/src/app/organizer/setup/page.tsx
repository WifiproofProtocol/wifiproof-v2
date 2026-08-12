import ProductShell from "@/components/product/ProductShell";

import OrganizerClient from "../OrganizerClient";

export default function OrganizerSetupPage() {
  return (
    <ProductShell current="organizer">
      <OrganizerClient />
    </ProductShell>
  );
}
