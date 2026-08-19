import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Smallest gap between two emails of the same kind to the same account.
//
// This is the durable half of the abuse defence — unlike the per-IP limiter
// in src/lib/rate-limit.ts, it lives in the database, so it holds across
// serverless instances and cold starts. Without it, one address could be
// mailed as fast as requests arrive: an inbox flood aimed at a member, and a
// Resend quota drained at no cost to whoever asked for it.
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Issues a fresh verification link, or null when this account was already
 * mailed one inside the cooldown.
 *
 * Callers treat null as "send nothing" and carry on reporting success anyway
 * — every one of them is a public endpoint that must not reveal whether an
 * account exists, let alone what state it is in.
 *
 * Issuing also retires every earlier token for the account. Two live links at
 * once is a wider window than the flow needs, and it used to be unbounded:
 * nothing removed old rows, so repeated requests left a growing pile of
 * simultaneously-valid tokens.
 */
export async function createEmailVerificationToken(userId: string): Promise<string | null> {
  const recent = await prisma.emailVerificationToken.findFirst({
    where: { userId, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return null;

  const token = generateToken();
  // Array-form $transaction (not the interactive callback form — Supabase's
  // pooled connection can't hold one open across round trips): the retirement
  // and the replacement have to land together, or a failure between them
  // leaves the account with no working link at all.
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
    }),
  ]);
  return token;
}

/** Password-reset counterpart of createEmailVerificationToken, same rules. */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return null;

  const token = generateToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { token, userId, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    }),
  ]);
  return token;
}
