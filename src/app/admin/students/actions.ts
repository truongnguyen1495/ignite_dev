"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type Level } from "@prisma/client";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import { optionalPhoneNumberSchema } from "@/lib/validation";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

function phoneNumberErrorFromP2002(e: unknown): string | undefined {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = e.meta?.target;
    const fields = Array.isArray(target) ? target : [];
    if (fields.includes("phoneNumber")) {
      return "Số điện thoại này đã được sử dụng.";
    }
    return "Email này đã được sử dụng.";
  }
  return undefined;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống."),
  email: z.string().trim().email("Email không hợp lệ."),
  phoneNumber: optionalPhoneNumberSchema,
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
  grantedLevel: levelEnum,
});

export async function createStudentAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    password: formData.get("password"),
    grantedLevel: formData.get("grantedLevel"),
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
        phoneNumber: parsed.data.phoneNumber,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        grantedLevel: parsed.data.grantedLevel,
      },
    });
  } catch (e) {
    const message = phoneNumberErrorFromP2002(e);
    if (message) {
      return message;
    }
    throw e;
  }

  revalidatePath("/admin/students");
  redirect("/admin/students");
}

const updateSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().trim().min(1, "Tên không được để trống."),
  email: z.string().trim().email("Email không hợp lệ."),
  phoneNumber: optionalPhoneNumberSchema,
  grantedLevel: levelEnum,
  password: z.union([z.string().min(8), z.literal("")]),
});

export async function updateStudentAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireActiveSuperAdmin();

  const parsed = updateSchema.safeParse({
    studentId: formData.get("studentId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    grantedLevel: formData.get("grantedLevel"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const { studentId, name, email, phoneNumber, grantedLevel, password } = parsed.data;

  const data: Prisma.UserUpdateInput = { name, email, phoneNumber, grantedLevel };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    await prisma.user.update({ where: { id: studentId, role: "STUDENT" }, data });
  } catch (e) {
    const message = phoneNumberErrorFromP2002(e);
    if (message) {
      return message;
    }
    throw e;
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  return undefined;
}

export async function setStudentStatusAction(studentId: string, locked: boolean) {
  await requireActiveSuperAdmin();
  await prisma.user.update({
    where: { id: studentId, role: "STUDENT" },
    data: { status: locked ? "LOCKED" : "ACTIVE" },
  });
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function approveStudentAction(studentId: string) {
  await requireActiveSuperAdmin();
  await prisma.user.update({
    where: { id: studentId, role: "STUDENT", status: "PENDING" },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function deleteStudentAction(studentId: string) {
  await requireActiveSuperAdmin();
  await prisma.user.delete({ where: { id: studentId, role: "STUDENT" } });
  revalidatePath("/admin/students");
}
