// Simple in-memory rate limiter for Phase 6 lightweight abuse protection.
// Not for production distributed limits — Vercel KV / Upstash would replace this.
// Fails open: any error returns allowed.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function keyFor(request: Request, fallback: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  return `${fallback}:${ip}`;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
  }
  return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
}

export function rateLimitByRequest(
  request: Request,
  opts: { keyPrefix: string; limit: number; windowMs: number }
): ReturnType<typeof checkRateLimit> {
  try {
    const key = keyFor(request, opts.keyPrefix);
    return checkRateLimit(key, opts.limit, opts.windowMs);
  } catch {
    return { allowed: true, remaining: opts.limit - 1, resetAt: Date.now() + opts.windowMs };
  }
}

// Periodic cleanup to avoid memory leak in long-lived server
if (typeof setInterval !== "undefined") {
  const g = globalThis as unknown as { __rateLimitCleanup?: NodeJS.Timeout };
  if (!g.__rateLimitCleanup) {
    g.__rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      buckets.forEach((_v, k) => {
        const b = buckets.get(k);
        if (b && b.resetAt <= now) buckets.delete(k);
      });
    }, 60_000);
    // Allow process to exit even if interval remains
    if (g.__rateLimitCleanup && typeof (g.__rateLimitCleanup as NodeJS.Timeout & { unref?: () => void }).unref === "function") {
      (g.__rateLimitCleanup as NodeJS.Timeout & { unref: () => void }).unref?.();
    }
  }
}
