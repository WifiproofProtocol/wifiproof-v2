import type { Metadata } from "next";

import { getSchoolState } from "@/lib/school-server";
import { EMPTY_SCHOOL_STATE } from "@/lib/school-types";

import SchoolClient from "./SchoolClient";

export const metadata: Metadata = {
  title: "WiFiProof School | Private Class Attendance",
  description: "Role-protected physical class attendance using institutional identity, enrolment, session windows, and venue network signals.",
};

export const dynamic = "force-dynamic";

export default async function SchoolPage() {
  const initialState = await getSchoolState().catch(() => EMPTY_SCHOOL_STATE);
  return <SchoolClient initialState={initialState} />;
}
