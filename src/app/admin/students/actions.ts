"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type Level } from "@prisma/client";
import { requireAnyAdminPermission, requireAdminPermission, requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS, NO_LEVEL_VALUE } from "@/lib/levels";
import { optionalPhoneNumberSchema } from "@/lib/validation";
import type { AdminPermissionKind } from "@prisma/client";

// Create/update/lock/delete are shared plumbing between the "Học viên"
// (MANAGE_STUDENTS) and "Học sinh" (MANAGE_PROSPECTIVE_STUDENTS) admin
// areas — both list pages and request-review queues stay separate, but
// either kind of admin needs to be able to manage the account record itself.
const STUDENT_MANAGEMENT_PERMISSIONS: AdminPermissionKind[] = ["MANAGE_STUDENTS", "MANAGE_PROSPECTIVE_STUDENTS"];

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);
// NO_LEVEL_VALUE ("NONE") represents "no cấp" (grantedLevel: null) in the
// admin create/edit student forms — not a real Level.
const grantedLevelField = z
  .union([levelEnum, z.literal(NO_LEVEL_VALUE)])
  .transform((v): Level | null => (v === NO_LEVEL_VALUE ? null : v));

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
  grantedLevel: grantedLevelField,
});

export async function createStudentAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAnyAdminPermission(STUDENT_MANAGEMENT_PERMISSIONS);

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
  revalidatePath("/admin/prospective-students");
  redirect("/admin/students");
}

const updateSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().trim().min(1, "Tên không được để trống."),
  email: z.string().trim().email("Email không hợp lệ."),
  phoneNumber: optionalPhoneNumberSchema,
  grantedLevel: grantedLevelField,
  password: z.union([z.string().min(8), z.literal("")]),
});

export async function updateStudentAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAnyAdminPermission(STUDENT_MANAGEMENT_PERMISSIONS);

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

  // Pushing a currently-leveled "học viên" back to "học sinh" (grantedLevel
  // -> null) via this shared edit form is the same demotion the dedicated
  // DemoteStudentButton performs — gate it identically, or that button's
  // permission boundary would be trivially bypassable through this form.
  const current = await prisma.user.findUnique({ where: { id: studentId }, select: { grantedLevel: true } });
  if (current?.grantedLevel !== null && grantedLevel === null) {
    await requireAdminPermission("DEMOTE_STUDENTS");
  }

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
  revalidatePath("/admin/prospective-students");
  redirect("/admin/students");
}

// Locking/deleting a "học viên" (grantedLevel set) is Super Admin only, per
// explicit user decision — not even a grantable AdminPermission, unlike
// everything else in this file. A "học sinh" (grantedLevel null) target
// keeps the original shared-permission check. Always re-read grantedLevel
// fresh here rather than trusting the caller's page context, same "never
// trust the client for an authorization decision" rule as the rest of the
// app's access control.
async function requireCanLockOrDeleteStudent(studentId: string) {
  const target = await prisma.user.findUnique({ where: { id: studentId }, select: { grantedLevel: true } });
  if (target?.grantedLevel !== null) {
    await requireActiveSuperAdmin();
  } else {
    await requireAnyAdminPermission(STUDENT_MANAGEMENT_PERMISSIONS);
  }
}

export async function setStudentStatusAction(studentId: string, locked: boolean) {
  await requireCanLockOrDeleteStudent(studentId);
  await prisma.user.update({
    where: { id: studentId, role: "STUDENT" },
    data: { status: locked ? "LOCKED" : "ACTIVE" },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/prospective-students");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function deleteStudentAction(studentId: string) {
  await requireCanLockOrDeleteStudent(studentId);
  await prisma.user.delete({ where: { id: studentId, role: "STUDENT" } });
  revalidatePath("/admin/students");
  revalidatePath("/admin/prospective-students");
}

// Explicit "revoke a học viên's level, push back to học sinh" action — same
// end state as picking "Học sinh" in the edit form's level dropdown, but as
// a dedicated one-click button (see DemoteStudentButton). Gated by its own
// permission rather than plain MANAGE_STUDENTS, per explicit user decision:
// Super Admin decides which admins may demote a học viên.
export async function demoteStudentAction(studentId: string) {
  await requireAdminPermission("DEMOTE_STUDENTS");
  await prisma.user.update({
    where: { id: studentId, role: "STUDENT" },
    data: { grantedLevel: null },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/prospective-students");
  revalidatePath(`/admin/students/${studentId}`);
}
