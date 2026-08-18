"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireActiveStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { phoneNumberSchema } from "@/lib/validation";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Họ và tên không được để trống."),
  // Optional everywhere — registration no longer asks for a birth date, so
  // the profile screen must let a member save without one (and clear one they
  // had) instead of blocking every other edit on this field. Blank becomes
  // null before coercion, since z.coerce.date() would read "" as 1970-01-01.
  dateOfBirth: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .date("Ngày sinh không hợp lệ.")
      .refine((date) => date.getTime() <= Date.now(), "Ngày sinh không được ở tương lai.")
      .nullable()
  ),
  phoneNumber: phoneNumberSchema,
});

export async function updateOwnProfileAction(input: {
  name: string;
  dateOfBirth: string;
  phoneNumber: string;
}): Promise<string | undefined> {
  const student = await requireActiveStudent();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  try {
    await prisma.user.update({
      where: { id: student.id },
      data: {
        name: parsed.data.name,
        dateOfBirth: parsed.data.dateOfBirth,
        phoneNumber: parsed.data.phoneNumber,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return "Số điện thoại này đã được sử dụng.";
    }
    throw e;
  }

  revalidatePath("/dashboard/profile");
  return undefined;
}

// The upload itself happens client-side against /api/profile/upload-avatar
// (a fetch()-driven route, same convention as every other image upload in
// this app — needed for the multipart file body). Clearing the field back
// to null needs no file handling, so it's a plain server action instead,
// matching updateOwnProfileAction/setOwnPasswordAction below.
export async function removeOwnAvatarAction(): Promise<string | undefined> {
  const student = await requireActiveStudent();
  await prisma.user.update({ where: { id: student.id }, data: { avatarUrl: null } });
  revalidatePath("/dashboard/profile");
  return undefined;
}

const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

// Only for an account that has no password yet — a Google-first-time-created
// account (see src/lib/auth.ts's signIn callback) can only ever authenticate
// via Google, which locks that student out entirely if a Super Admin later
// turns Settings.googleLoginEnabled off. This gives them an escape hatch
// while they still have a working session. Deliberately not a general
// change-password flow (that's a different, unrequested feature) — an
// account that already has a password is rejected here.
export async function setOwnPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<string | undefined> {
  const student = await requireActiveStudent();
  if (student.passwordHash) {
    return "Tài khoản của bạn đã có mật khẩu.";
  }

  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: student.id }, data: { passwordHash } });

  revalidatePath("/dashboard/profile");
  return undefined;
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự."),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Xác nhận mật khẩu mới không khớp.",
    path: ["confirmNewPassword"],
  });

// Counterpart to setOwnPasswordAction, for the opposite case: an account
// that already has a password wants to change it. Requires the current
// password (bcrypt-verified, same check as login's authorize()) rather than
// just trusting the active session, since a logged-in browser tab left open
// shouldn't be enough on its own to silently take over the credential.
export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<string | undefined> {
  const student = await requireActiveStudent();
  if (!student.passwordHash) {
    return "Tài khoản của bạn chưa có mật khẩu — hãy đặt mật khẩu trước.";
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, student.passwordHash);
  if (!valid) {
    return "Mật khẩu hiện tại không đúng.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: student.id }, data: { passwordHash } });

  revalidatePath("/dashboard/profile");
  return undefined;
}
