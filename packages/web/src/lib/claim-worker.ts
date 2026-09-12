import "server-only";

import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";
import { relayAttendanceClaim, type RelayAuthorization } from "@/lib/cdp-relay";

type ClaimJob = {
  id: string;
  idempotency_key: string;
  attendance_authorization: RelayAuthorization;
  proof_hex: `0x${string}`;
  public_inputs: `0x${string}`[];
  attempts: number;
};

export async function processClaimJob(jobId: string) {
  const supabase = getEventsSupabaseAdmin();
  const { data, error } = await supabase.rpc("lease_claim_job", { target_job_id: jobId });
  const job = (Array.isArray(data) ? data[0] : data) as ClaimJob | undefined;
  if (error) throw new Error("Claim job could not be leased");
  if (!job) return { status: "busy" as const };

  try {
    const relay = await relayAttendanceClaim({
      idempotencyKey: job.idempotency_key,
      authorization: job.attendance_authorization,
      proof: job.proof_hex,
      publicInputs: job.public_inputs,
    });
    const { error: updateError } = await supabase
      .from("claim_jobs")
      .update({
        status: "confirmed",
        tx_hash: relay.transactionHash,
        attestation_uid: relay.attestationUid,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (updateError) throw new Error("Confirmed claim job could not be updated");
    return { status: "confirmed" as const, ...relay };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Relay failed";
    const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7));
    await supabase
      .from("claim_jobs")
      .update({
        status: "failed",
        last_error: message,
        next_attempt_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { status: "failed" as const, error: message };
  }
}
