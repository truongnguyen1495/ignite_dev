import "server-only";
import { createHash } from "crypto";

/**
 * A short stamp of the credential a session was issued against.
 *
 * This app uses the JWT session strategy with no database Adapter, so there
 * is no sessions table to delete rows from — a token stays valid until it
 * expires no matter what happens to the account behind it. That left a real
 * gap: changing a password (or resetting a forgotten one, which is what
 * someone does when they suspect a break-in) did nothing to the sessions
 * already out there. The person being locked out could keep browsing.
 *
 * Deriving the stamp from the password hash rather than storing a version
 * counter means no new column and no migration, and it catches every way the
 * credential can change at once — the reset flow, the profile's change-
 * password form, its set-password form for a Google-first account, and an
 * admin resetting it on someone's behalf. Any of them produces a new bcrypt
 * hash, so every token stamped with the old one stops matching.
 *
 * It is a fingerprint, not a secret: it never leaves the server except inside
 * the signed session token, and 16 hex characters of SHA-256 over a value
 * that is itself a salted bcrypt hash gives nothing away about the password.
 */
export function credentialFingerprint(passwordHash: string | null): string {
  // A Google-only account has no hash yet. Folding that case into a fixed
  // string rather than skipping the check means setOwnPasswordAction — which
  // gives such an account its first password — also retires its old sessions.
  return createHash("sha256").update(passwordHash ?? "no-password").digest("hex").slice(0, 16);
}
