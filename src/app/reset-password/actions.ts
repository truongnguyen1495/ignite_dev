"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

export type ResetPasswordState = { fieldErrors: Partial<Record<"password" | "confirmPassword", string>> } | undefined;

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: ResetPasswordState = { fieldErrors: {} };
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors!.fieldErrors)) {
        (fieldErrors!.fieldErrors as Record<string, string>)[key] = issue.message;
      }
    }
    return fieldErrors;
  }

  // Re-validated here (not just at page render) since the token could have
  // expired or already been consumed between the page loading and this
  // submit — the same defense-in-depth reasoning as every other guard in
  // this codebase re-checking fresh from the DB rather than trusting an
  // earlier read.
  const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.expiresAt < new Date()) {
    return { fieldErrors: { password: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  redirect("/login?reset=1");
}
