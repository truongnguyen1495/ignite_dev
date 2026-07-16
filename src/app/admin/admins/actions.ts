"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSuperAdmin, requireAdminManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Prisma, type AdminPermissionKind } from "@prisma/client";

export type AccountSearchResult = { id: string; name: string; email: string; username: string | null };

// An Admin Manager reaching this page (canManageAdmins) must never see, let
// alone act on, another Admin Manager or a Super Admin — that boundary is
// "chỉ admin thường" per the confirmed design, checked with this helper at
// every action below rather than only hiding it in the UI.
function assertManageableByCaller(isSuperAdmin: boolean, target: { isAdminManager: boolean }): string | undefined {
  if (!isSuperAdmin && target.isAdminManager) {
    return "Bạn không có quyền thao tác trên tài khoản Admin Manager.";
  }
  return undefined;
}

export async function searchAccountsForPermissionAction(query: string): Promise<AccountSearchResult[]> {
  const { isSuperAdmin } = await requireAdminManagementAccess();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      // An Admin Manager must not even find another Admin Manager in this
      // picker — same boundary as assertManageableByCaller below.
      ...(isSuperAdmin ? {} : { isAdminManager: false }),
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
  await requireAdminManagementAccess();

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

// Replaces the account's active permission set with `permissions` (an empty
// array fully revokes limited-admin access) and updates its adminOnly kind
// in the same save. Permissions dropped from the set are soft-revoked
// (revokedAt set), not deleted, so the grant survives to be restored later
// (restoreRevokedPermissionsAction below) and grant history stays intact.
// Array-form $transaction, not the interactive-callback form: see
// saveQuizAction in admin/quizzes/actions.ts for why (Supabase's pooled
// connection doesn't support holding a transaction open across round trips).
export async function setAccountPermissionsAction(
  userId: string,
  permissions: AdminPermissionKind[],
  adminOnly: boolean
): Promise<string | undefined> {
  const { user: admin, isSuperAdmin } = await requireAdminManagementAccess();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { adminPermissions: true },
  });
  if (!target || target.role !== "STUDENT") {
    return "Không tìm thấy tài khoản học viên này.";
  }
  const targetError = assertManageableByCaller(isSuperAdmin, target);
  if (targetError) return targetError;

  const unique = Array.from(new Set(permissions));
  const existingByPermission = new Map(target.adminPermissions.map((p) => [p.permission, p]));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      // Turning adminOnly on always clears isAdminManager/canManageAdmins in
      // the same write — an Admin Manager is by definition a real học viên
      // (see schema.prisma), so this keeps that invariant intact even though
      // only a Super Admin can reach this branch for an isAdminManager
      // target (assertManageableByCaller above already blocks an Admin
      // Manager caller from touching one).
      data: adminOnly ? { adminOnly, isAdminManager: false, canManageAdmins: false } : { adminOnly },
    }),
    prisma.adminPermission.updateMany({
      where: { userId, revokedAt: null, permission: { notIn: unique } },
      data: { revokedAt: new Date() },
    }),
    ...unique.flatMap((permission) => {
      const existing = existingByPermission.get(permission);
      if (!existing) {
        return [prisma.adminPermission.create({ data: { userId, permission, grantedById: admin.id } })];
      }
      if (existing.revokedAt !== null) {
        return [
          prisma.adminPermission.update({
            where: { id: existing.id },
            data: { revokedAt: null, grantedById: admin.id, grantedAt: new Date() },
          }),
        ];
      }
      return [];
    }),
  ]);

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}`);
  return undefined;
}

// Undoes the most recent revoke — reactivates every AdminPermission row that
// shares the latest revokedAt timestamp (the batch from one revoke action,
// whether that was the revoke-all button or an editor save that unchecked
// some boxes), not every permission ever revoked in this account's history.
export async function restoreRevokedPermissionsAction(userId: string): Promise<string | undefined> {
  const { isSuperAdmin } = await requireAdminManagementAccess();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STUDENT") {
    return "Không tìm thấy tài khoản học viên này.";
  }
  const targetError = assertManageableByCaller(isSuperAdmin, target);
  if (targetError) return targetError;

  const lastRevoked = await prisma.adminPermission.findFirst({
    where: { userId, revokedAt: { not: null } },
    orderBy: { revokedAt: "desc" },
    select: { revokedAt: true },
  });
  if (!lastRevoked) return undefined;

  await prisma.adminPermission.updateMany({
    where: { userId, revokedAt: lastRevoked.revokedAt },
    data: { revokedAt: null },
  });

  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}`);
  return undefined;
}

export async function setAdminAccountStatusAction(userId: string, locked: boolean) {
  const { isSuperAdmin } = await requireAdminManagementAccess();
  const target = await prisma.user.findUnique({ where: { id: userId, role: "STUDENT" } });
  if (!target) redirect("/admin/admins");
  if (!isSuperAdmin && target.isAdminManager) {
    redirect("/admin/admins?denied=1");
  }
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
// decides a student's account can disappear. adminOnly: true in the where
// clause already excludes any Admin Manager account (which is always a real
// học viên, adminOnly false — see schema.prisma), but the explicit check
// below keeps that boundary readable here too.
export async function deleteAdminAccountAction(userId: string) {
  const { isSuperAdmin } = await requireAdminManagementAccess();
  const target = await prisma.user.findUnique({ where: { id: userId, role: "STUDENT" } });
  if (!target) redirect("/admin/admins");
  if (!isSuperAdmin && target.isAdminManager) {
    redirect("/admin/admins?denied=1");
  }
  await prisma.user.delete({ where: { id: userId, role: "STUDENT", adminOnly: true } });
  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}

// Designating (or revoking) the Admin Manager tier itself is a Super-Admin-
// only action, never delegable through canManageAdmins — kept as its own
// requireActiveSuperAdmin gate, separate from requireAdminManagementAccess
// which the rest of this file uses. Eligibility (a real học viên: adminOnly
// false, grantedLevel set) is only enforced when turning the flag ON;
// revoking is always allowed. canManageAdmins is meaningless without
// isAdminManager, so turning the latter off always clears the former too.
export async function setAdminManagerAction(
  userId: string,
  isAdminManager: boolean,
  canManageAdmins: boolean
): Promise<string | undefined> {
  await requireActiveSuperAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STUDENT") {
    return "Không tìm thấy tài khoản học viên này.";
  }
  if (isAdminManager && (target.adminOnly || target.grantedLevel === null)) {
    return "Chỉ có thể chỉ định Admin Manager cho tài khoản học viên đã có cấp (không phải tài khoản chỉ-admin hoặc học sinh).";
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isAdminManager, canManageAdmins: isAdminManager ? canManageAdmins : false },
  });
  revalidatePath("/admin/admins");
  revalidatePath(`/admin/admins/${userId}`);
  return undefined;
}
