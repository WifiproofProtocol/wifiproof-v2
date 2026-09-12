import { NextResponse } from "next/server";

import { getSchoolState } from "@/lib/school-server";
import { createSchoolServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || password.length < 8) {
      return NextResponse.json({ error: "Enter your school email and password." }, { status: 400 });
    }

    const supabase = await createSchoolServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: "These credentials do not match an active school account." }, { status: 401 });
    }

    const state = await getSchoolState(supabase);
    if (!state.viewer) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account has no active school access." }, { status: 403 });
    }
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "School sign-in is unavailable." }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSchoolServerClient();
    await supabase.auth.signOut();
  } catch {
    // Signing out remains idempotent when the backend is unavailable.
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
