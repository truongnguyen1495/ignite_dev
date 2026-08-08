"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DailyTask } from "@prisma/client";
import { requireActiveStudent, requireOwnGroupLeadership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { todayVN, type CreateDailyTaskInput } from "@/lib/groups";
import {
  getTaskAudienceUserIds,
  pickAndRecordSpin,
  reviewTaskExplanation,
  validateAndBuildDailyTaskData,
} from "@/lib/group-data";

// Shared guard for every mutation below — a task can only be touched by a
// student who (a) is currently in the same group that owns it, and (b) is
// actually in its audience (assignAllMembers, or an explicit
// DailyTaskAssignee row). Re-checked on every call rather than trusted from
// the client, same "always fresh from DB" convention as src/lib/access.ts.
// Returns an error string instead of throwing — a thrown Error from inside a
// Server Action bypasses this app's `string | undefined` error convention
// and surfaces as a generic crash (nearest error.tsx boundary) instead of an
// inline message, for what's actually a plausible case: a leader deletes or
// reassigns a task while a student still has the page open.
async function assertTaskAssignedToStudent(
  taskId: string,
  studentId: string
): Promise<{ error: string } | { task: DailyTask }> {
  const task = await prisma.dailyTask.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Nhiệm vụ không còn tồn tại — hãy tải lại trang." };

  const membership = await prisma.groupMembership.findUnique({ where: { userId: studentId } });
  if (!membership || membership.groupId !== task.groupId) {
    return { error: "Nhiệm vụ này không thuộc nhóm của bạn." };
  }

  const audienceIds = await getTaskAudienceUserIds(task);
  if (!audienceIds.includes(studentId)) {
    return { error: "Nhiệm vụ này không giao cho bạn." };
  }
  return { task };
}

export async function markTaskDoneAction(taskId: string, done: boolean): Promise<string | undefined> {
  const student = await requireActiveStudent();
  const check = await assertTaskAssignedToStudent(taskId, student.id);
  if ("error" in check) return check.error;

  const today = todayVN();
  await prisma.dailyTaskCompletion.upsert({
    where: { taskId_userId_date: { taskId, userId: student.id, date: today } },
    create: {
      taskId,
      userId: student.id,
      date: today,
      status: done ? "DONE" : "MISSED",
      completedAt: done ? new Date() : null,
    },
    update: { status: done ? "DONE" : "MISSED", completedAt: done ? new Date() : null },
  });

  revalidatePath("/dashboard/my-group");
  return undefined;
}

export async function submitTaskExplanationAction(
  taskId: string,
  explanationText: string
): Promise<string | undefined> {
  const student = await requireActiveStudent();
  const text = explanationText.trim();
  if (!text) return "Vui lòng nhập lý do.";

  const check = await assertTaskAssignedToStudent(taskId, student.id);
  if ("error" in check) return check.error;

  const today = todayVN();
  await prisma.dailyTaskCompletion.upsert({
    where: { taskId_userId_date: { taskId, userId: student.id, date: today } },
    create: {
      taskId,
      userId: student.id,
      date: today,
      status: "EXPLAINED_PENDING",
      explanationText: text,
      explainedAt: new Date(),
    },
    update: { status: "EXPLAINED_PENDING", explanationText: text, explainedAt: new Date() },
  });

  revalidatePath("/dashboard/my-group");
  return undefined;
}

export type SpinActionResult =
  | { error: string }
  | { label: string; points: number | null; spinsRemaining: number };

export async function spinWheelAction(): Promise<SpinActionResult> {
  const student = await requireActiveStudent();
  const result = await pickAndRecordSpin(student.id);
  if (!result) {
    return { error: "Bạn đã hết lượt quay hôm nay, quay lại vào ngày mai nhé." };
  }

  revalidatePath("/dashboard/my-group");
  return {
    label: result.reward.label,
    points: result.reward.type === "POINTS" ? result.reward.value : null,
    spinsRemaining: result.spinsRemaining,
  };
}

// LEADER/DEPUTY-only actions below — gated by requireOwnGroupLeadership
// (GroupMembership.role), never an AdminPermission (see the comment on that
// function in src/lib/access.ts for why).

export async function createDailyTaskAction(input: CreateDailyTaskInput): Promise<string | undefined> {
  const { student, membership } = await requireOwnGroupLeadership();

  const result = await validateAndBuildDailyTaskData(membership.groupId, input, student.id);
  if ("error" in result) return result.error;

  await prisma.dailyTask.create({ data: result.data });

  revalidatePath("/dashboard/my-group");
  redirect("/dashboard/my-group");
}

export async function reviewExplanationAction(completionId: string, approve: boolean): Promise<string | undefined> {
  const { student, membership } = await requireOwnGroupLeadership();

  const error = await reviewTaskExplanation(completionId, membership.groupId, student.id, approve);
  if (error) return error;

  revalidatePath("/dashboard/my-group/explanations");
  revalidatePath("/dashboard/my-group");
  return undefined;
}
