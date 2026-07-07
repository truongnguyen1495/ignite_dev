import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the NextAuth config — no providers, no Prisma, no
// bcrypt. This is what middleware.ts uses (it runs on the Edge runtime,
// which cannot bundle Prisma Client or Node-only crypto libs). The full
// config in auth.ts spreads this and adds the Credentials provider for
// everything else (Route Handlers, Server Components, Server Actions),
// which run on the Node.js runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
    updateAge: 5 * 60,
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.grantedLevel = user.grantedLevel;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.grantedLevel = token.grantedLevel;
      return session;
    },
  },
} satisfies NextAuthConfig;
