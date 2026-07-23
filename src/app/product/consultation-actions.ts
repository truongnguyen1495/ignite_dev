"use server";

import { z } from "zod";
import { requireLeveledStudent } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// "Đặt lịch tư vấn" on the product landing pages (bespoke + generic) —
// a pre-sale contact request, entirely separate from Order/CartItem. Just
// writes a row for an admin to follow up on later (see /admin/consultations);
// nothing else in the app reads this table.
const consultationSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ."),
  preferredTime: z.string().trim().min(1, "Vui lòng nhập khung giờ mong muốn."),
});

export async function requestConsultationAction(
  productId: string,
  name: string,
  phone: string,
  preferredTime: string
): Promise<{ error?: string }> {
  const student = await requireLeveledStudent();

  const parsed = consultationSchema.safeParse({ name, phone, preferredTime });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  await prisma.consultationRequest.create({
    data: { productId, studentId: student.id, ...parsed.data },
  });
  return {};
}
