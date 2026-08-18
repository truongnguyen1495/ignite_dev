/**
 * Sanitises a "where should I go after logging in" path.
 *
 * Only a same-site, absolute path survives. Anything protocol-relative
 * (`//evil.example`), backslash-escaped (`/\evil.example`, which some
 * browsers normalise to a host) or absolute-with-scheme is rejected — this
 * value reaches signIn's redirectTo, and an open redirect on a login form is
 * a phishing primitive, not a cosmetic bug.
 *
 * Returns null when nothing safe was supplied, so callers fall back to their
 * own default rather than to attacker-chosen input.
 */
export function sanitizeNextPath(next: string | undefined | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  // Second character decides: "//host" and "/\host" both leave the site.
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  // No control characters, which can be used to smuggle past naive checks.
  if (/[\x00-\x1f]/.test(next)) return null;
  return next;
}

/** Builds the login URL that remembers what someone was trying to buy. */
export function loginUrlForPurchase(returnTo: string, itemTitle: string): string {
  const safe = sanitizeNextPath(returnTo) ?? "/dashboard";
  return `/login?next=${encodeURIComponent(safe)}&mua=${encodeURIComponent(itemTitle)}`;
}
