type RateEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateEntry>();

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0 };
  }

  entry.count += 1;
  store.set(key, entry);
  return { ok: true, remaining: max - entry.count };
}
