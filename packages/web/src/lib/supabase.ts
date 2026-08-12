import { createClient } from "@supabase/supabase-js";

import { getSchoolSupabasePublishableKey, getSchoolSupabaseUrl } from "@/lib/supabase-config";

export const schoolSupabase = createClient(getSchoolSupabaseUrl(), getSchoolSupabasePublishableKey());
