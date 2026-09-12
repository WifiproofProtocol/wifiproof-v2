import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSchoolServerClient } from "@/lib/supabase-server";
import { getTrustedClientIp } from "@/lib/trusted-ip";
import {
  EMPTY_SCHOOL_STATE,
  type SchoolAttendance,
  type SchoolEnrollment,
  type SchoolMember,
  type SchoolSession,
  type SchoolState,
  type SchoolTeachingAssignment,
  type SchoolUnit,
  type SchoolViewer,
} from "@/lib/school-types";

type SchoolProfileRow = {
  user_id: string;
  organization_id: string;
  institutional_id: string;
  display_name: string;
  role: SchoolViewer["role"];
  active: boolean;
  must_change_password: boolean;
};

export async function getSchoolContext(supabase?: SupabaseClient) {
  const client = supabase ?? (await createSchoolServerClient());
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { supabase: client, viewer: null as SchoolViewer | null };

  const { data: profile } = await client
    .from("school_profiles")
    .select("user_id, organization_id, institutional_id, display_name, role, active, must_change_password")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle<SchoolProfileRow>();

  if (!profile) return { supabase: client, viewer: null as SchoolViewer | null };

  const viewer: SchoolViewer = {
    userId: profile.user_id,
    organizationId: profile.organization_id,
    institutionalId: profile.institutional_id,
    name: profile.display_name,
    email: data.user.email ?? "",
    role: profile.role,
    mustChangePassword: profile.must_change_password,
  };
  return { supabase: client, viewer };
}

export async function getSchoolState(supabase?: SupabaseClient): Promise<SchoolState> {
  const context = await getSchoolContext(supabase);
  if (!context.viewer) return EMPTY_SCHOOL_STATE;

  const client = context.supabase;
  const [organizationResult, unitsResult, sessionsResult, attendanceResult, enrollmentsResult, assignmentsResult, membersResult] =
    await Promise.all([
      client.from("school_organizations").select("id, name, slug").eq("id", context.viewer.organizationId).maybeSingle(),
      client.from("school_units").select("id, code, title, room").eq("active", true).order("code"),
      client.from("school_sessions").select("id, unit_id, lecturer_user_id, network_label, starts_at, ends_at, status").order("starts_at", { ascending: false }).limit(100),
      client.from("school_attendance").select("id, session_id, student_user_id, status, recorded_at").order("recorded_at", { ascending: false }).limit(500),
      client.from("school_enrollments").select("unit_id, student_user_id, active").eq("active", true),
      client.from("school_unit_lecturers").select("unit_id, lecturer_user_id"),
      client.from("school_profiles").select("user_id, institutional_id, display_name, role, active").order("display_name"),
    ]);

  const firstError = [organizationResult, unitsResult, sessionsResult, attendanceResult, enrollmentsResult, assignmentsResult, membersResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error("School records could not be loaded");

  return {
    viewer: context.viewer,
    organization: organizationResult.data
      ? { id: organizationResult.data.id, name: organizationResult.data.name, slug: organizationResult.data.slug }
      : null,
    units: (unitsResult.data ?? []).map((row): SchoolUnit => ({ id: row.id, code: row.code, title: row.title, room: row.room })),
    sessions: (sessionsResult.data ?? []).map((row): SchoolSession => ({
      id: row.id,
      unitId: row.unit_id,
      lecturerUserId: row.lecturer_user_id,
      networkLabel: row.network_label,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
    })),
    attendance: (attendanceResult.data ?? []).map((row): SchoolAttendance => ({
      id: row.id,
      sessionId: row.session_id,
      studentUserId: row.student_user_id,
      status: row.status,
      recordedAt: row.recorded_at,
    })),
    enrollments: (enrollmentsResult.data ?? []).map((row): SchoolEnrollment => ({
      unitId: row.unit_id,
      studentUserId: row.student_user_id,
      active: row.active,
    })),
    teachingAssignments: (assignmentsResult.data ?? []).map((row): SchoolTeachingAssignment => ({
      unitId: row.unit_id,
      lecturerUserId: row.lecturer_user_id,
    })),
    members: (membersResult.data ?? []).map((row): SchoolMember => ({
      userId: row.user_id,
      institutionalId: row.institutional_id,
      name: row.display_name,
      role: row.role,
      active: row.active,
    })),
  };
}

export function resolveSchoolNetworkEvidence(request: Request) {
  const ip = getTrustedClientIp(request);
  const allowLocal = process.env.NODE_ENV !== "production" && process.env.SCHOOL_ALLOW_LOCAL_NETWORK === "true";
  const source = ip ?? (allowLocal ? "local-development" : null);
  if (!source) throw new Error("Venue network verification is unavailable");

  const secret = process.env.SCHOOL_NETWORK_HMAC_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Venue network verification is not configured");
  }
  const fingerprint = createHmac("sha256", secret || "development-only-network-key").update(source).digest("hex");
  return {
    fingerprint,
    label: allowLocal && !ip ? "Local development network" : `Verified venue network • ${fingerprint.slice(0, 6)}`,
  };
}
