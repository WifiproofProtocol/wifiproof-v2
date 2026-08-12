import { NextResponse } from "next/server";

import { getSchoolContext, getSchoolState } from "@/lib/school-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, viewer } = await getSchoolContext();
    if (!viewer) return NextResponse.json({ error: "Sign in again to update your password." }, { status: 401 });
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    if (password.length < 12) {
      return NextResponse.json({ error: "Use at least 12 characters." }, { status: 400 });
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return NextResponse.json({ error: "The password could not be updated." }, { status: 400 });
    const { error: profileError } = await supabase.rpc("school_complete_password_change");
    if (profileError) return NextResponse.json({ error: "The account update could not be completed." }, { status: 500 });
    return NextResponse.json(await getSchoolState(supabase));
  } catch {
    return NextResponse.json({ error: "The password could not be updated." }, { status: 503 });
  }
}
