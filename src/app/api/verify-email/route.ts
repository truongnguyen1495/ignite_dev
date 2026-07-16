import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mutating GET is intentional here — this is exactly the "click the link
// in your email" flow, which is a plain hyperlink, not a form. Consumes the
// token: on success, every outstanding EmailVerificationToken row for that
// user is deleted (not just the one used), since a stale second link from an
// earlier resend should stop working once the account is verified.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const loginUrl = new URL("/login", request.url);

  if (!token) {
    loginUrl.searchParams.set("verified", "0");
    return NextResponse.redirect(loginUrl);
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    loginUrl.searchParams.set("verified", "0");
    return NextResponse.redirect(loginUrl);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  loginUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(loginUrl);
}
