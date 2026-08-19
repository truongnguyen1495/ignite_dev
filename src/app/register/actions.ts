"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRegistrationEnabled, isEmailVerificationEnabled } from "@/lib/access";
import { DEFAULT_LEVEL } from "@/lib/levels";
import { phoneNumberSchema, optionalDateOfBirthSchema } from "@/lib/validation";
import { createEmailVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { allowByIp, MINUTE_MS } from "@/lib/rate-limit";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Họ và tên không được để trống."),
    email: z.string().trim().email("Email không hợp lệ."),
    phoneNumber: phoneNumberSchema,
    dateOfBirth: optionalDateOfBirthSchema,
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

export type RegisterFieldErrors = Partial<
  Record<"name" | "email" | "phoneNumber" | "dateOfBirth" | "password" | "confirmPassword", string>
>;

export type RegisterState = { fieldErrors: RegisterFieldErrors } | undefined;

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  // Defense in depth — the page itself already hides the form when
  // registration is disabled, but a direct POST must be rejected too.
  if (!(await isRegistrationEnabled())) {
    redirect("/register");
  }

  // Checked before the schema parse and well before bcrypt.hash, which is the
  // expensive part: a flood should be turned away at the cheapest possible
  // point, not after the server has already done ~100ms of hashing per
  // request. Unlike the reset flows this one names what happened — there is
  // no account state to protect here, only the cost of creating accounts.
  if (!(await allowByIp("register", 5, 10 * MINUTE_MS))) {
    return {
      fieldErrors: { email: "Bạn đã thử đăng ký quá nhiều lần. Vui lòng đợi vài phút rồi thử lại." },
    };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber"),
    // Optional — an untouched input posts "", and a payload missing the key
    // entirely yields null; optionalDateOfBirthSchema maps both to null.
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
        phoneNumber: parsed.data.phoneNumber,
        dateOfBirth: parsed.data.dateOfBirth,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        // Every self-registered account starts at Cấp 1 immediately — no
        // manual admin approval gate for new signups. DEFAULT_LEVEL rather
        // than a literal, so renaming the ladder never silently re-points
        // where new members land.
        grantedLevel: DEFAULT_LEVEL,
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
      // Never null on this path (the account was created a line ago, so it
      // has no earlier token to be inside a cooldown for), but the type says
      // it can be and the flow below is fine either way — the member can
      // always ask for a new link from /login/unverified.
      if (token) {
        await sendVerificationEmail(user.email, token);
      }
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
