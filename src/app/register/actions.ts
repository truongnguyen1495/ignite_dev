"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRegistrationEnabled, isEmailVerificationEnabled } from "@/lib/access";
import { phoneNumberSchema, dateOfBirthSchema } from "@/lib/validation";
import { createEmailVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Họ và tên không được để trống."),
    email: z.string().trim().email("Email không hợp lệ."),
    username: z
      .string()
      .trim()
      .min(3, "Username phải có ít nhất 3 ký tự.")
      .regex(/^[a-zA-Z0-9_.]+$/, "Username chỉ được chứa chữ, số, dấu chấm và gạch dưới."),
    phoneNumber: phoneNumberSchema,
    dateOfBirth: dateOfBirthSchema,
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

export type RegisterFieldErrors = Partial<
  Record<"name" | "email" | "username" | "phoneNumber" | "dateOfBirth" | "password" | "confirmPassword", string>
>;

export type RegisterState = { fieldErrors: RegisterFieldErrors } | undefined;

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  // Defense in depth — the page itself already hides the form when
  // registration is disabled, but a direct POST must be rejected too.
  if (!(await isRegistrationEnabled())) {
    redirect("/register");
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    phoneNumber: formData.get("phoneNumber"),
    dateOfBirth: formData.get("dateOfBirth"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: RegisterFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        (fieldErrors as Record<string, string>)[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const verificationRequired = await isEmailVerificationEnabled();

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        username: parsed.data.username,
        phoneNumber: parsed.data.phoneNumber,
        dateOfBirth: parsed.data.dateOfBirth,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        // No cấp — not on the 5-level ladder until an admin approves a join
        // request from /dashboard/level-up (see requireLeveledStudent).
        grantedLevel: null,
        // Only left unverified when the toggle is actually on — otherwise
        // this account should never be retroactively affected if the
        // toggle gets turned on later (same reasoning as the pre-existing
        // rows backfilled in the migration that added this column).
        emailVerified: verificationRequired ? null : new Date(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = e.meta?.target;
      const fields = Array.isArray(target) ? target : [];
      if (fields.includes("username")) {
        return { fieldErrors: { username: "Username này đã được sử dụng." } };
      }
      if (fields.includes("phoneNumber")) {
        return { fieldErrors: { phoneNumber: "Số điện thoại này đã được sử dụng." } };
      }
      return { fieldErrors: { email: "Email này đã được sử dụng." } };
    }
    throw e;
  }

  if (verificationRequired) {
    try {
      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, token);
    } catch (e) {
      // The account was created successfully either way — a failed send
      // (e.g. Resend misconfigured) shouldn't block registration. The user
      // can still ask for a new link from /login/unverified.
      console.error("Failed to send verification email:", e);
    }
    redirect("/register/success?verify=1");
  }

  redirect("/register/success");
}
