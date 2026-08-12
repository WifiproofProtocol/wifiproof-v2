"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSchoolSupabasePublishableKey, getSchoolSupabaseUrl } from "@/lib/supabase-config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSchoolSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSchoolSupabaseUrl(), getSchoolSupabasePublishableKey());
  }
  return browserClient;
}
