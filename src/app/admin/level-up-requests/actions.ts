"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

export async function approveLevelUpRequestAction(formData: FormData) {
  const admin = await requireAdminPermission("MANAGE_LEVEL_UP_REQUESTS");

  const requestId = String(formData.get("requestId") ?? "");
  const parsedLevel = levelEnum.safeParse(formData.get("toLevel"));
  if (!requestId || !parsedLevel.success) {
    redirect("/admin/level-up-requests");
  }

  const request = await prisma.levelUpRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") {
    redirect("/admin/level-up-requests");
  }

  await prisma.$transaction([
    prisma.levelUpRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        toLevel: parsedLevel.data,
        reviewedAt: new Date(),
        reviewerId: admin.id,
      },
    }),
    prisma.user.update({
      where: { id: request.studentId },
      data: { grantedLevel: parsedLevel.data },
    }),
  ]);

  revalidatePath("/admin/level-up-requests");
  redirect("/admin/level-up-requests");
}

const rejectSchema = z.object({
  requestId: z.string().min(1),
  reviewerNote: z.string().trim().min(1, "Vui lòng nhập lý do từ chối."),
});

export async function rejectLevelUpRequestAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_LEVEL_UP_REQUESTS");

  const parsed = rejectSchema.safeParse({
    requestId: formData.get("requestId"),
    reviewerNote: formData.get("reviewerNote"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const request = await prisma.levelUpRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.status !== "PENDING") {
    return "Yêu cầu không còn hợp lệ (có thể đã được xử lý).";
  }

  await prisma.levelUpRequest.update({
    where: { id: parsed.data.requestId },
    data: {
      status: "REJECTED",
      reviewerNote: parsed.data.reviewerNote,
      reviewedAt: new Date(),
      reviewerId: admin.id,
    },
  });

  revalidatePath("/admin/level-up-requests");
  redirect("/admin/level-up-requests");
}
