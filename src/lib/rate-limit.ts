import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window request counter kept in this process's memory.
 *
 * Deliberately not backed by the database. DATABASE_URL runs with
 * connection_limit=1 and every round trip costs roughly 350ms, so putting a
 * read and a write in front of each login attempt would cost the app more
 * than the abuse it turns away.
 *
 * The limitation, stated plainly: on Vercel each serverless instance holds
 * its own Map and a cold start begins with an empty one, so an attacker
 * spread across instances gets more than `limit` attempts. This is a brake on
 * the ordinary case — one script hammering one endpoint — not a guarantee.
 * The defences that actually hold are per-account and live in the database:
 * the login cooldown in src/lib/auth.ts, and the per-account send cooldown in
 * src/lib/verification-tokens.ts.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

// Ceiling on distinct keys held at once, so a flood of spoofed
// X-Forwarded-For values can't grow this Map until the instance runs out of
// memory. Expired entries are dropped first; if that frees nothing, the whole
// Map goes. Losing the counts is the right failure here — a rate limiter that
// takes the process down with it is worse than one that briefly forgets.
const MAX_TRACKED_KEYS = 10_000;

function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
}

/**
 * Records one hit against `key`. Returns false once the window is full, which
 * the caller should treat as "refuse this request", not "retry".
 */
export function consume(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/**
 * Best-effort caller address. Behind Vercel's proxy X-Forwarded-For is set by
 * the platform, but it is still a header and a direct-to-origin request can
 * say anything — which is why exceeding a limit only ever costs a caller the
 * request, and never records anything durable against an account.
 */
export async function callerIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

/** consume(), keyed by one named bucket plus the caller's address. */
export async function allowByIp(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  return consume(`${bucket}:${await callerIp()}`, limit, windowMs);
}

export const MINUTE_MS = 60 * 1000;
