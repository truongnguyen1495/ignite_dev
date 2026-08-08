"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function upsertPersonalityResultAction(
  userId: string,
  testId: string,
  resultLabel: string,
  note: string
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_TESTS");
  const label = resultLabel.trim();
  if (!label) return "Vui lòng nhập nhãn kết quả.";

  await prisma.personalityResult.upsert({
    where: { testId_userId: { testId, userId } },
    create: { testId, userId, resultLabel: label, note: note.trim() || null, enteredById: admin.id },
    update: { resultLabel: label, note: note.trim() || null, enteredById: admin.id, enteredAt: new Date() },
  });

  revalidatePath("/admin/tests");
  return undefined;
}

export async function deletePersonalityResultAction(userId: string, testId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_TESTS");
  await prisma.personalityResult.deleteMany({ where: { userId, testId } });
  revalidatePath("/admin/tests");
  return undefined;
}
