"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ORDERED_LEVELS } from "@/lib/levels";
import type { Level } from "@prisma/client";

const levelEnum = z.enum(ORDERED_LEVELS as [Level, ...Level[]]);

// Reviewing "tham gia hệ thống đào tạo 5 cấp" requests admits a học sinh
// into the leveled Học viên roster, so this lives under MANAGE_STUDENTS
// (the "Học viên" admin area), not MANAGE_PROSPECTIVE_STUDENTS — moved here
// from admin/prospective-students per explicit user correction.
export async function approveJoinRequestAction(formData: FormData) {
  const admin = await requireAdminPermission("MANAGE_STUDENTS");

  const requestId = String(formData.get("requestId") ?? "");
  const parsedLevel = levelEnum.safeParse(formData.get("toLevel"));
  if (!requestId || !parsedLevel.success) {
    redirect("/admin/students");
  }

  const request = await prisma.levelUpRequest.findUnique({ where: { id: requestId } });
  // toLevel non-null would be an existing "học viên" requesting the next
  // level — reviewed on /admin/level-up-requests instead, under a separate
  // permission.
  if (!request || request.status !== "PENDING" || request.fromLevel !== null) {
    redirect("/admin/students");
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

  revalidatePath("/admin/students");
  revalidatePath("/admin/prospective-students");
  redirect("/admin/students");
}

// Admin-initiated equivalent of approveJoinRequestAction — admits a học
// sinh directly from /admin/prospective-students without requiring them to
// have submitted a "tham gia hệ thống" request first. If a pending request
// already exists it's resolved the same way approval does (so it doesn't
// linger in the review queue); otherwise a pre-approved LevelUpRequest row
// is still created so "Lịch sử xin lên cấp" on the student's detail page
// has a record of how they joined, matching the shape approval leaves.
export async function admitProspectiveStudentAction(studentId: string, toLevel: Level) {
  const admin = await requireAdminPermission("MANAGE_STUDENTS");

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT" || student.grantedLevel !== null) {
    return;
  }

  const pendingRequest = await prisma.levelUpRequest.findFirst({
    where: { studentId, status: "PENDING", fromLevel: null },
  });

  await prisma.$transaction([
    pendingRequest
      ? prisma.levelUpRequest.update({
          where: { id: pendingRequest.id },
          data: { status: "APPROVED", toLevel, reviewedAt: new Date(), reviewerId: admin.id },
        })
      : prisma.levelUpRequest.create({
          data: {
            studentId,
            fromLevel: null,
            toLevel,
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewerId: admin.id,
          },
        }),
    prisma.user.update({ where: { id: studentId }, data: { grantedLevel: toLevel } }),
  ]);

  revalidatePath("/admin/students");
  revalidatePath("/admin/prospective-students");
}

const rejectSchema = z.object({
  requestId: z.string().min(1),
  reviewerNote: z.string().trim().min(1, "Vui lòng nhập lý do từ chối."),
});

export async function rejectJoinRequestAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_STUDENTS");

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

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
