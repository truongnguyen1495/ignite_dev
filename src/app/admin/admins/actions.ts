"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Prisma, type AdminPermissionKind } from "@prisma/client";

export type AccountSearchResult = { id: string; name: string; email: string; username: string | null };

export async function searchAccountsForPermissionAction(query: string): Promise<AccountSearchResult[]> {
  await requireActiveSuperAdmin();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { username: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, username: true },
    take: 20,
    orderBy: { name: "asc" },
  });
}

const createAdminAccountSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống."),
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
  adminOnly: z.boolean(),
});

export type CreateAdminAccountResult = {
  error?: string;
  account?: { id: string; name: string; email: string };
};

// Creates a brand-new STUDENT account (role is never SUPER_ADMIN here — see
// requireAnyAdminAccess in src/lib/access.ts for why a STUDENT can still act
// as a limited admin) with no permissions yet; the caller redirects into
// that account's /admin/admins/[id] detail page to grant permissions next.
export async function createAdminAccountAction(input: {
  name: string;
  email: string;
  password: string;
  adminOnly: boolean;
}): Promise<CreateAdminAccountResult> {
  await requireActiveSuperAdmin();

  const parsed = createAdminAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const account = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        adminOnly: parsed.data.adminOnly,
      },
      select: { id: true, name: true, email: true },
    });
    revalidatePath("/admin/admins");
    return { account };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email này đã được sử dụng." };
    }
    throw e;
  }
}

// Replaces the account's entire permission set with `permissions` (an empty
// array fully revokes limited-admin access) and updates its adminOnly kind
// in the same save. Array-form $transaction, not the interactive-callback
// form: see saveQuizAction in admin/quizzes/actions.ts for why (Supabase's
// pooled connection doesn't support holding a transaction open across round
// trips).
export async function setAccountPermissionsAction(
  userId: string,
  permissions: AdminPermissionKind[],
  adminOnly: boolean
): Promise<string | undefined> {
  const admin = await requireActiveSuperAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STUDENT") {
    return "Không tìm thấy tài khoản học viên này.";
  }

  const unique = Array.from(new Set(permissions));
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { adminOnly } }),
    prisma.adminPermission.deleteMany({ where: { userId } }),
    ...(unique.length > 0
      ? [
          prisma.adminPermission.createMany({
            data: unique.map((permission) => ({ userId, permission, grantedById: admin.id })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}`);
  return undefined;
}

export async function setAdminAccountStatusAction(userId: string, locked: boolean) {
  await requireActiveSuperAdmin();
  await prisma.user.update({
    where: { id: userId, role: "STUDENT" },
    data: { status: locked ? "LOCKED" : "ACTIVE" },
  });
  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}`);
}

// Only ever offered for adminOnly accounts in the UI — a dual-role admin is
// still a real student, and deleting that account is exclusively
// /admin/students' call (deleteStudentAction) so there's one place that
// decides a student's account can disappear.
export async function deleteAdminAccountAction(userId: string) {
  await requireActiveSuperAdmin();
  await prisma.user.delete({ where: { id: userId, role: "STUDENT", adminOnly: true } });
  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}
