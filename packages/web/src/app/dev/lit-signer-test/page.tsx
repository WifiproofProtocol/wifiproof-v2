import { notFound } from "next/navigation";

import { LitSignerTestClient } from "./LitSignerTestClient";

export default function LitSignerTestPage() {
  const enabled =
    process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_TEST_PAGES === "true";

  if (!enabled) {
    notFound();
  }

  return <LitSignerTestClient />;
}
