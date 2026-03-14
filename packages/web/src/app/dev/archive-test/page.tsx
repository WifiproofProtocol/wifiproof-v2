import { notFound } from "next/navigation";

import { ArchiveTestClient } from "./ArchiveTestClient";

export default function ArchiveTestPage() {
  const enabled =
    process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_TEST_PAGES === "true";

  if (!enabled) {
    notFound();
  }

  return <ArchiveTestClient />;
}
