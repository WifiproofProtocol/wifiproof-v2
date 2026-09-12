import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSchoolSupabasePublishableKey, getSchoolSupabaseUrl } from "@/lib/supabase-config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(getSchoolSupabaseUrl(), getSchoolSupabasePublishableKey(), {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    await supabase.auth.getClaims();
  } catch {
    // Public pages still render when Supabase has not been configured locally.
  }

  return response;
}

export const config = {
  matcher: ["/school/:path*", "/api/school/:path*"],
};
