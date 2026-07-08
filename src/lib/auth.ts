import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

// Thrown by authorize() once credentials are confirmed correct but the
// account is locked, so the login action can send the user to a dedicated
// "account disabled" page instead of the generic wrong-credentials message.
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

// Thrown when credentials are correct but the account is a self-registered
// student still awaiting Super Admin approval — distinct from "locked" so
// the login action can show the right message.
export class AccountPendingError extends CredentialsSignin {
  code = "account_pending";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        // Checked after the password so account status is only revealed to
        // someone who already knows the correct password, not to anyone
        // guessing emails.
        if (user.status === "LOCKED") {
          throw new AccountLockedError();
        }
        if (user.status === "PENDING") {
          throw new AccountPendingError();
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
  ],
});
