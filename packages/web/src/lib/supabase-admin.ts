import { createClient, SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

let adminClient: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (adminClient) return adminClient;

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin env missing");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}
