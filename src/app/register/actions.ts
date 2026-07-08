"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Họ và tên không được để trống."),
    email: z.string().trim().email("Email không hợp lệ."),
    username: z
      .string()
      .trim()
      .min(3, "Username phải có ít nhất 3 ký tự.")
      .regex(/^[a-zA-Z0-9_.]+$/, "Username chỉ được chứa chữ, số, dấu chấm và gạch dưới."),
    displayName: z.string().trim().min(1, "Tên hiển thị không được để trống."),
    dateOfBirth: z.coerce
      .date()
      .refine((date) => !Number.isNaN(date.getTime()), "Ngày sinh không hợp lệ.")
      .refine((date) => date.getTime() <= Date.now(), "Ngày sinh không được ở tương lai."),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    dateOfBirth: formData.get("dateOfBirth"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        username: parsed.data.username,
        displayName: parsed.data.displayName,
        dateOfBirth: parsed.data.dateOfBirth,
        passwordHash,
        role: "STUDENT",
        status: "PENDING",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = e.meta?.target;
      const fields = Array.isArray(target) ? target : [];
      if (fields.includes("username")) {
        return "Username này đã được sử dụng.";
      }
      return "Email này đã được sử dụng.";
    }
    throw e;
  }

  redirect("/register/success");
}
