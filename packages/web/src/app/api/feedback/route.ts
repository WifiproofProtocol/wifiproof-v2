import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type FeedbackBody = {
  eventId: string;
  wallet: string;
  worked: boolean;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackBody;
    const { eventId, wallet, worked, notes } = body;

    if (!eventId || !wallet || worked === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId.toLowerCase(),
      wallet: wallet.toLowerCase(),
      worked,
      notes: notes ?? null,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
