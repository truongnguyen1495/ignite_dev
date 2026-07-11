"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

export async function approveJoinRequestAction(formData: FormData) {
  const admin = await requireAdminPermission("MANAGE_PROSPECTIVE_STUDENTS");

  const requestId = String(formData.get("requestId") ?? "");
  const parsedLevel = levelEnum.safeParse(formData.get("toLevel"));
  if (!requestId || !parsedLevel.success) {
    redirect("/admin/prospective-students");
  }

  const request = await prisma.levelUpRequest.findUnique({ where: { id: requestId } });
  // toLevel non-null would be an existing "học viên" requesting the next
  // level — reviewed on /admin/level-up-requests instead, under a separate
  // permission.
  if (!request || request.status !== "PENDING" || request.fromLevel !== null) {
    redirect("/admin/prospective-students");
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

  revalidatePath("/admin/prospective-students");
  revalidatePath("/admin/students");
  redirect("/admin/prospective-students");
}

const rejectSchema = z.object({
  requestId: z.string().min(1),
  reviewerNote: z.string().trim().min(1, "Vui lòng nhập lý do từ chối."),
});

export async function rejectJoinRequestAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_PROSPECTIVE_STUDENTS");

  const parsed = rejectSchema.safeParse({
    requestId: formData.get("requestId"),
    reviewerNote: formData.get("reviewerNote"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
  }

  const request = await prisma.levelUpRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.status !== "PENDING" || request.fromLevel !== null) {
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

  revalidatePath("/admin/prospective-students");
  redirect("/admin/prospective-students");
}
