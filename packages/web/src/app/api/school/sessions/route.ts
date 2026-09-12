import { NextResponse } from "next/server";

import { getSchoolContext, getSchoolState, resolveSchoolNetworkEvidence } from "@/lib/school-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { supabase, viewer } = await getSchoolContext();
    if (!viewer || viewer.role !== "lecturer") {
      return NextResponse.json({ error: "Lecturer access is required." }, { status: 403 });
    }

    const body = (await request.json()) as { unitId?: string; durationMinutes?: number };
    const durationMinutes = Math.round(Number(body.durationMinutes));
    if (!body.unitId || !Number.isFinite(durationMinutes) || durationMinutes < 10 || durationMinutes > 60) {
      return NextResponse.json({ error: "Choose an assigned unit and a 10 to 60 minute window." }, { status: 400 });
    }

    const { data: unit } = await supabase
      .from("school_units")
      .select("id, room")
      .eq("id", body.unitId)
      .maybeSingle();
    if (!unit) return NextResponse.json({ error: "This unit is not available to your account." }, { status: 403 });

    const network = resolveSchoolNetworkEvidence(request);
    const { error } = await supabase.from("school_sessions").insert({
      organization_id: viewer.organizationId,
      unit_id: unit.id,
      lecturer_user_id: viewer.userId,
      network_fingerprint: network.fingerprint,
      network_label: `${network.label} · ${unit.room}`,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
      status: "open",
    });
    if (error) return NextResponse.json({ error: "You can open sessions only for assigned units." }, { status: 403 });

    return NextResponse.json(await getSchoolState(supabase), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The session could not be opened." }, { status: 400 });
  }
}
