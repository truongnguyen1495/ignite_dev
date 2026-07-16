"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/verification-tokens";
import { sendPasswordResetEmail } from "@/lib/email";

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

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  // A Google-only account (no passwordHash) has no password to reset.
  if (user && user.passwordHash) {
    try {
      const token = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user.email, token);
    } catch (e) {
      console.error("Failed to send password reset email:", e);
    }
  }

  return { sent: true };
}
