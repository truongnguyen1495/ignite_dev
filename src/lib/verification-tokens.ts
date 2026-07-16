import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
  });
  return token;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });
  return token;
}
