function requireEnv(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is not configured`);
  return normalized;
}

export function getEventsSupabaseUrl() {
  return requireEnv("EVENTS_SUPABASE_URL", process.env.EVENTS_SUPABASE_URL);
}

export function getEventsSupabaseSecretKey() {
  return requireEnv("EVENTS_SUPABASE_SECRET_KEY", process.env.EVENTS_SUPABASE_SECRET_KEY);
}

export function getSchoolSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SCHOOL_SUPABASE_URL", process.env.NEXT_PUBLIC_SCHOOL_SUPABASE_URL);
}

export function getSchoolSupabasePublishableKey() {
  return requireEnv(
    "NEXT_PUBLIC_SCHOOL_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SCHOOL_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSchoolSupabaseSecretKey() {
  return requireEnv("SCHOOL_SUPABASE_SECRET_KEY", process.env.SCHOOL_SUPABASE_SECRET_KEY);
}
