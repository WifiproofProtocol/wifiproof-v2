import { NextResponse } from "next/server";

import { getSchoolContext, getSchoolState, resolveSchoolNetworkEvidence } from "@/lib/school-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Gate = { key: string; label: string; passed: boolean; detail: string };

export async function POST(request: Request) {
  try {
    const { supabase, viewer } = await getSchoolContext();
    if (!viewer || viewer.role !== "student") {
      return NextResponse.json({ error: "Student access is required." }, { status: 403 });
    }
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId) return NextResponse.json({ error: "Choose a class session." }, { status: 400 });

    const { data: session } = await supabase
      .from("school_sessions")
      .select("id, organization_id, unit_id, network_fingerprint, starts_at, ends_at, status")
      .eq("id", body.sessionId)
      .maybeSingle();
    const network = resolveSchoolNetworkEvidence(request);
    const now = Date.now();

    const [{ data: enrollment }, { data: existing }] = await Promise.all([
      session
        ? supabase.from("school_enrollments").select("unit_id").eq("unit_id", session.unit_id).eq("student_user_id", viewer.userId).eq("active", true).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("school_attendance").select("id").eq("session_id", body.sessionId).eq("student_user_id", viewer.userId).maybeSingle(),
    ]);

    const isOpen = Boolean(
      session && session.status === "open" && now >= Date.parse(session.starts_at) && now <= Date.parse(session.ends_at),
    );
    const networkMatches = Boolean(session && session.network_fingerprint === network.fingerprint);
    const gates: Gate[] = [
      { key: "identity", label: "Authenticated student", passed: true, detail: "The request is bound to your private school account." },
      { key: "enrollment", label: "Unit enrolment", passed: Boolean(enrollment), detail: enrollment ? "Your active enrolment matches this unit." : "Your account is not enrolled in this unit." },
      { key: "session", label: "Lecturer-controlled window", passed: isOpen, detail: isOpen ? "The lecturer's attendance window is open." : "This session is closed or outside its attendance window." },
      { key: "network", label: "Venue network signal", passed: networkMatches, detail: networkMatches ? "Your request uses the network captured for this class." : "Join the approved classroom network and try again." },
      { key: "duplicate", label: "Single submission", passed: !existing, detail: existing ? "Attendance was already recorded for this session." : "No earlier attendance record exists." },
    ];

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, gates, state: await getSchoolState(supabase) });
    }
    if (!session || gates.some((gate) => !gate.passed)) {
      return NextResponse.json({ ok: false, duplicate: false, gates, state: await getSchoolState(supabase) }, { status: 403 });
    }

    const { data: recordStatus, error } = await supabase.rpc("school_record_attendance", {
      target_session: session.id,
      supplied_network_fingerprint: network.fingerprint,
    });
    if (error || recordStatus === "denied") {
      return NextResponse.json({ error: "Attendance could not be recorded." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, duplicate: recordStatus === "duplicate", gates, state: await getSchoolState(supabase) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Attendance could not be processed." }, { status: 400 });
  }
}
