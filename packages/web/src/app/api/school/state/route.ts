import { NextResponse } from "next/server";

import { getSchoolState } from "@/lib/school-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSchoolState(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "School data is unavailable. Confirm the Supabase project and migrations are configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
