"use server";

import { revalidatePath } from "next/cache";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { AdminPermissionKind } from "@prisma/client";

export async function setChatEnabledAction(chatEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { chatEnabled },
    create: { id: 1, chatEnabled },
  });
  revalidatePath("/admin/settings");
}

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

export async function getAccountPermissionsAction(userId: string): Promise<AdminPermissionKind[]> {
  await requireActiveSuperAdmin();
  const rows = await prisma.adminPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return rows.map((r) => r.permission);
}

// Replaces the account's entire permission set with `permissions` (an empty
// array fully revokes limited-admin access, without touching its STUDENT
// role or any other data) — simpler for the UI than tracking an add/remove
// diff, and this table is small per user so the full delete+recreate is
// cheap. Array-form $transaction, not the interactive-callback form: see
// saveQuizAction in admin/quizzes/actions.ts for why (Supabase's pooled
// connection doesn't support holding a transaction open across round trips).
export async function setAccountPermissionsAction(
  userId: string,
  permissions: AdminPermissionKind[]
): Promise<string | undefined> {
  const admin = await requireActiveSuperAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "STUDENT") {
    return "Không tìm thấy tài khoản học viên này.";
  }

  const unique = Array.from(new Set(permissions));
  await prisma.$transaction([
    prisma.adminPermission.deleteMany({ where: { userId } }),
    ...(unique.length > 0
      ? [
          prisma.adminPermission.createMany({
            data: unique.map((permission) => ({ userId, permission, grantedById: admin.id })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/settings");
  return undefined;
}
