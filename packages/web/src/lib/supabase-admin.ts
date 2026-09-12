import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getEventsSupabaseSecretKey, getEventsSupabaseUrl } from "@/lib/supabase-config";

type AdminClient = SupabaseClient;

let adminClient: AdminClient | null = null;

export function getEventsSupabaseAdmin(): AdminClient {
  if (adminClient) return adminClient;

  adminClient = createClient(getEventsSupabaseUrl(), getEventsSupabaseSecretKey(), {
    auth: { persistSession: false },
  });

  return adminClient;
}
