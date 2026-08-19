"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/verification-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { allowByIp, MINUTE_MS } from "@/lib/rate-limit";

const emailSchema = z.string().trim().email("Email không hợp lệ.");

export type ForgotPasswordState = { fieldError?: string; sent?: boolean } | undefined;

// Always resolves to `sent: true` on a validly-formatted email regardless of
// whether an account exists for it — same account-enumeration defense used
// throughout the auth flows (never reveal account state to an unproven caller).
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldError: parsed.error.issues[0]?.message ?? "Email không hợp lệ." };
  }

  // A per-IP brake on top of the per-account cooldown inside
  // createPasswordResetToken. That one keeps a single inbox from being
  // flooded; this one keeps a script from walking a list of addresses. Still
  // reports success when it fires — telling a blocked caller they were
  // blocked is itself an answer about this address.
  if (!(await allowByIp("forgot-password", 5, 15 * MINUTE_MS))) {
    return { sent: true };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  // A Google-only account (no passwordHash) has no password to reset.
  if (user && user.passwordHash) {
    try {
      const token = await createPasswordResetToken(user.id);
      // null means a link went to this account moments ago — sending a
      // second one is the exact thing the cooldown exists to stop.
      if (token) {
        await sendPasswordResetEmail(user.email, token);
      }
    } catch (e) {
      console.error("Failed to send password reset email:", e);
    }
  }

  return { sent: true };
}
