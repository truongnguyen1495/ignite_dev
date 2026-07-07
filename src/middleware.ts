import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Middleware runs on the Edge runtime, which cannot bundle Prisma Client or
// bcrypt — so this uses its own lightweight NextAuth instance built from the
// edge-safe authConfig only (no Credentials provider), instead of importing
// the full auth() from src/lib/auth.ts.
const { auth } = NextAuth(authConfig);

// This middleware is a coarse, Edge-runtime redirect for UX only (fast bounce
// to /login, no flash of protected content). It reads claims off the JWT and
// does NOT hit the database, so it can be stale (e.g. right after an account
// is locked or a level grant changes). It must never be treated as the real
// authorization boundary — every page/Server Action re-checks status and
// grantedLevel fresh from the DB via src/lib/access.ts.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard") && session.user.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
