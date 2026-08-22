"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { FinanceEntryType } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isValidCategoryForType } from "@/lib/finance-labels";

const entrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Vui lòng chọn danh mục."),
  amount: z.number().int("Số tiền không hợp lệ.").positive("Số tiền phải lớn hơn 0."),
  occurredAt: z.string().min(1, "Vui lòng chọn ngày."),
  note: z.string().trim().min(1, "Vui lòng nhập ghi chú."),
});

export type CreateFinanceEntryInput = {
  type: FinanceEntryType;
  category: string;
  amount: number;
  occurredAt: string;
  note: string;
};

export async function createFinanceEntryAction(
  input: CreateFinanceEntryInput
): Promise<{ error?: string }> {
  const admin = await requireAdminPermission("MANAGE_FINANCE");

  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const { type, category, amount, occurredAt, note } = parsed.data;
  if (!isValidCategoryForType(category, type)) {
    return { error: "Danh mục không khớp với loại giao dịch." };
  }

  // "YYYY-MM-DD" from a <input type="date"> parses as UTC midnight of that
  // calendar day — exactly what the @db.Date column expects, no VN-offset
  // conversion needed (see FinanceEntry.occurredAt's own comment).
  const occurredAtDate = new Date(occurredAt);
  if (Number.isNaN(occurredAtDate.getTime())) {
    return { error: "Ngày không hợp lệ." };
  }

  await prisma.financeEntry.create({
    data: { type, category, amount, note, occurredAt: occurredAtDate, createdById: admin.id },
  });

  revalidatePath("/admin/finance");
  return {};
}

// Void, not edit — see FinanceEntry's own comment: a mis-entered amount is
// corrected by voiding this row and adding a new correct one, same
// convention as Refund, never a silent in-place edit of a figure someone may
// already have reported against.
export async function deleteFinanceEntryAction(entryId: string): Promise<{ error?: string }> {
  await requireAdminPermission("MANAGE_FINANCE");
  await prisma.financeEntry.updateMany({
    where: { id: entryId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/finance");
  return {};
}
