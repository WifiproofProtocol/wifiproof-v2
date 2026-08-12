import "server-only";

import { createHmac } from "node:crypto";

import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";

export async function checkRateLimit(key: string, max: number, windowMs: number) {
  const secret =
    process.env.RATE_LIMIT_HMAC_SECRET?.trim() ??
    process.env.HUMANITY_TOKEN_SECRET?.trim() ??
    process.env.WORLD_TOKEN_SECRET?.trim();
  if (!secret) throw new Error("Missing RATE_LIMIT_HMAC_SECRET");

  const keyHash = createHmac("sha256", secret).update(key).digest("hex");
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const { data, error } = await getEventsSupabaseAdmin().rpc("consume_api_rate_limit", {
    p_key_hash: keyHash,
    p_limit: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limiting is unavailable");

  const result = Array.isArray(data) ? data[0] : data;
  return {
    ok: result?.allowed === true,
    remaining: Number(result?.remaining ?? 0),
    resetAt: result?.reset_at ? Date.parse(String(result.reset_at)) : Date.now() + windowMs,
  };
}
