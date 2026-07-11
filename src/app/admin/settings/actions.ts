"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireActiveSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Prisma, type AdminPermissionKind } from "@prisma/client";

export async function setChatEnabledAction(chatEnabled: boolean) {
  await requireActiveSuperAdmin();
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { chatEnabled },
    create: { id: 1, chatEnabled },
  });
  revalidatePath("/admin/settings");
}

const createAdminAccountSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống."),
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

export type CreateAdminAccountResult = {
  error?: string;
  account?: { id: string; name: string; email: string };
};

// Creates a brand-new STUDENT account (role is never SUPER_ADMIN here — see
// requireAnyAdminAccess in src/lib/access.ts for why a STUDENT can still act
// as a limited admin) with no permissions yet; the caller opens the
// permission editor for the returned account right after, in the same flow
// as picking an existing one via searchAccountsForPermissionAction.
export async function createAdminAccountAction(input: {
  name: string;
  email: string;
  password: string;
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
      },
      select: { id: true, name: true, email: true },
    });
    revalidatePath("/admin/settings");
    return { account };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Email này đã được sử dụng." };
    }
    throw e;
  }
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
