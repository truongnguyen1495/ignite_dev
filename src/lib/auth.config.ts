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
      // `user` is only present on the initial sign-in, never on the silent
      // refreshes updateAge triggers — which is exactly what makes this the
      // right place to stamp the credential. The value then rides along
      // unchanged for the life of the session, so a refresh can't launder an
      // old token into looking newly issued.
      if (user) {
        token.role = user.role;
        token.grantedLevel = user.grantedLevel;
        token.credentialFingerprint = user.credentialFingerprint;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.grantedLevel = token.grantedLevel;
      session.user.credentialFingerprint = token.credentialFingerprint;
      return session;
    },
  },
} satisfies NextAuthConfig;
