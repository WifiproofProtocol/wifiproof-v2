import { NextResponse } from "next/server";

import { processClaimJob } from "@/lib/claim-worker";
import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await getEventsSupabaseAdmin()
    .from("claim_jobs")
    .select("id")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempts", 20)
    .order("next_attempt_at")
    .limit(10);
  if (error) return NextResponse.json({ error: "Claim jobs could not be loaded" }, { status: 500 });
  const results = [];
  for (const job of data ?? []) results.push({ jobId: job.id, ...(await processClaimJob(job.id)) });
  return NextResponse.json({ processed: results.length, results });
}
