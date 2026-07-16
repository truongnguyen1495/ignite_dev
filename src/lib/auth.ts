import NextAuth, { CredentialsSignin } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

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
      // account existence/kind to an unauthenticated caller.
      if (!user || !user.passwordHash) {
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        // Brute-force cooldown: increment regardless of any existing
        // lockedUntil (a guess made during an active cooldown still
        // counts) so it keeps extending while wrong guesses continue.
        const attempts = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: attempts >= FAILED_LOGIN_LIMIT ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil,
          },
        });
        return null;
      }

      // Everything below only runs once the password is confirmed
      // correct — same reasoning as the LOCKED check further down: never
      // reveal account state (rate-limited, disabled, unverified) to
      // someone who hasn't already proven they know the password.
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new TooManyAttemptsError();
      }

      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
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
        // First time this Google email has ever signed in — auto-create a
        // "chưa xếp cấp" account, same shape as public self-registration,
        // gated by the same registrationEnabled switch rather than a
        // second "who can join" toggle.
        if (!(settings.registrationEnabled ?? true)) {
          return false;
        }
        dbUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? user.email.split("@")[0],
            role: "STUDENT",
            status: "ACTIVE",
            grantedLevel: null,
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
      return true;
    },
  },
});
