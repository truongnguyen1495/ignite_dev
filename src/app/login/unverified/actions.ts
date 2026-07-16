"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createEmailVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";

const emailSchema = z.string().trim().email();

// Always resolves the same way regardless of whether the email exists or is
// already verified — same account-enumeration defense as the login/register
// flows never revealing account state to an unproven caller.
export async function resendVerificationEmailAction(email: string): Promise<void> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (!user || user.emailVerified) {
    return;
  }

  try {
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error("Failed to resend verification email:", e);
  }
}
