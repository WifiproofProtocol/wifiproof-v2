import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSchoolSupabasePublishableKey, getSchoolSupabaseUrl } from "@/lib/supabase-config";

export async function createSchoolServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSchoolSupabaseUrl(), getSchoolSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The proxy refreshes them.
        }
      },
    },
  });
}
