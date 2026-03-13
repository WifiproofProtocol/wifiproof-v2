function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/i, "").trim();
}

function readFirstIp(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeIp(value.split(",")[0]?.trim() ?? "");
  return normalized || null;
}

export function getTrustedClientIp(request: Request): string | null {
  const vercelIp = readFirstIp(request.headers.get("x-vercel-forwarded-for"));
  if (vercelIp) {
    return vercelIp;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      readFirstIp(request.headers.get("x-forwarded-for")) ??
      readFirstIp(request.headers.get("x-real-ip"))
    );
  }

  return null;
}
