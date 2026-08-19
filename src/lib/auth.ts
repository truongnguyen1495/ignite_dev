import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { DEFAULT_LEVEL } from "@/lib/levels";
import { credentialFingerprint } from "@/lib/session-fingerprint";

// Thrown by authorize() once credentials are confirmed correct but the
// account is locked, so the login action can send the user to a dedicated
// "account disabled" page instead of the generic wrong-credentials message.
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

// Thrown once credentials are confirmed correct but the account is in a
// brute-force cooldown (see FAILED_LOGIN_LIMIT/LOCKOUT_DURATION_MS below) —
// distinct from AccountLockedError, which is a permanent admin-set lock.
export class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

// Thrown once credentials are confirmed correct but Settings.emailVerificationEnabled
// is on and the account hasn't clicked its verification link yet.
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

const FAILED_LOGIN_LIMIT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// A real bcrypt hash (cost 10, of a throwaway string nobody can submit) used
// only to burn the same ~100ms a genuine comparison costs when there is no
// account to compare against.
//
// Returning early for an unknown email made this route answer in about a
// millisecond, while a known one took as long as bcrypt does — a difference
// big enough to read over the network, which handed anyone a way to test
// whether an address has an account here. Comparing against this constant
// instead makes both paths cost the same, so the "treated identically to a
// wrong password" promise below holds in time as well as in wording.
const TIMING_EQUALIZER_HASH = "$2b$10$48bbAJM418XYA/LFx8dEI.PFhS3.BZhr0eGjeNXqUYLaBH7FZx.wK";

// Google is only registered as a provider when its credentials are actually
// configured — Settings.googleLoginEnabled also gates the button/flow at
// runtime (see the signIn callback below), but omitting the provider
// entirely when the env vars are blank avoids handing NextAuth an
// undefined clientId/clientSecret before a Super Admin has set either up.
const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email;
      const password = credentials?.password;
      if (typeof email !== "string" || typeof password !== "string") {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      // A Google-only account (no passwordHash) can never succeed here —
      // treated identically to a wrong password so this doesn't leak
      // account existence/kind to an unauthenticated caller. The throwaway
      // comparison keeps that true of the response time too, not just the
      // response (see TIMING_EQUALIZER_HASH).
      if (!user || !user.passwordHash) {
        await bcrypt.compare(password, TIMING_EQUALIZER_HASH);
        return null;
      }

      // Brute-force cooldown, decided BEFORE the password is looked at.
      // This check used to sit below bcrypt.compare, which meant a wrong
      // guess was only ever counted and never actually refused: an attacker
      // could keep guessing at full speed, and the distinct error raised on
      // a correct guess during an active cooldown told them they had just
      // found the password. Refusing up here evaluates no guess at all, so
      // the answer stops depending on what was typed.
      //
      // The trade-off is that reaching this message confirms an account
      // exists at this address — weaker than it sounds, since the timing of
      // bcrypt.compare below already gives that away to anyone measuring it,
      // and it costs five wrong guesses to reach.
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new TooManyAttemptsError();
      }

      // A cooldown that has already run out resets the counter before this
      // attempt is judged. Carrying failedLoginAttempts >= FAILED_LOGIN_LIMIT
      // forward would re-lock the account for another 15 minutes on the very
      // next typo, and on every typo after that, since each one still counts
      // past the limit.
      const priorAttempts = user.lockedUntil ? 0 : user.failedLoginAttempts;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        const attempts = priorAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            // Always written out, never carried over: any lockedUntil still
            // on the row here is an expired one the guard above let through,
            // and leaving it in place would keep the account looking locked
            // to the reset below.
            lockedUntil: attempts >= FAILED_LOGIN_LIMIT ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
          },
        });
        return null;
      }

      // Everything below only runs once the password is confirmed
      // correct — same reasoning as the LOCKED check further down: never
      // reveal account state (disabled, unverified) to someone who hasn't
      // already proven they know the password.
      if (priorAttempts > 0 || user.lockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
      }

      if (user.status === "LOCKED") {
        throw new AccountLockedError();
      }

      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      if (settings?.emailVerificationEnabled && !user.emailVerified) {
        throw new EmailNotVerifiedError();
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        grantedLevel: user.grantedLevel,
        // Stamped here so every later request can tell whether the password
        // this session was issued against is still the account's password —
        // see src/lib/session-fingerprint.ts.
        credentialFingerprint: credentialFingerprint(user.passwordHash),
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // Runs for every provider. Credentials sign-ins are already fully
    // vetted inside authorize() above, so this only does real work for
    // Google. Without a database Adapter (this app uses the JWT session
    // strategy throughout), NextAuth would otherwise identify the session
    // by the Google profile's own id — mutating `user` here re-points it at
    // our own User row (by email) before the shared jwt() callback in
    // auth.config.ts reads user.id/role/grantedLevel off it.
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }
      if (!user.email) {
        return false;
      }

      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      if (!settings?.googleLoginEnabled) {
        return false;
      }

      let dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) {
        // First time this Google email has ever signed in — auto-create an
        // account at Cấp 1, same shape as public self-registration, gated
        // by the same registrationEnabled switch rather than a second "who
        // can join" toggle.
        if (!(settings.registrationEnabled ?? true)) {
          return false;
        }
        dbUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? user.email.split("@")[0],
            role: "STUDENT",
            status: "ACTIVE",
            grantedLevel: DEFAULT_LEVEL,
            // Google already proved ownership of this address.
            emailVerified: new Date(),
          },
        });
      } else if (!dbUser.emailVerified) {
        // Signing in via Google re-proves address ownership even for a
        // pre-existing Credentials account that never clicked its own
        // verification link.
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { emailVerified: new Date() },
        });
      }

      if (dbUser.status === "LOCKED") {
        return false;
      }

      user.id = dbUser.id;
      user.name = dbUser.name;
      user.role = dbUser.role;
      user.grantedLevel = dbUser.grantedLevel;
      user.credentialFingerprint = credentialFingerprint(dbUser.passwordHash);
      return true;
    },
  },
});
