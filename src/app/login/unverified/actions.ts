"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createEmailVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allowByIp, MINUTE_MS } from "@/lib/rate-limit";

const emailSchema = z.string().trim().email();

// Always resolves the same way regardless of whether the email exists or is
// already verified — same account-enumeration defense as the login/register
// flows never revealing account state to an unproven caller.
export async function resendVerificationEmailAction(email: string): Promise<void> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return;
  }

  // Same pairing as the forgot-password flow: a per-IP brake here, a
  // per-account cooldown inside createEmailVerificationToken. Returning early
  // is indistinguishable from every other outcome, which is the point.
  if (!(await allowByIp("resend-verification", 5, 15 * MINUTE_MS))) {
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (!user || user.emailVerified) {
    return;
  }

  try {
    const token = await createEmailVerificationToken(user.id);
    // null means this account was already sent a link inside the cooldown.
    if (!token) return;
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error("Failed to resend verification email:", e);
  }
}
