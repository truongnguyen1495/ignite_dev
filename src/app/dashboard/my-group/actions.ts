"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DailyTask } from "@prisma/client";
import { requireActiveStudent, requireOwnGroupLeadership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isTaskManageableByLeadership, todayVN, type CreateDailyTaskInput } from "@/lib/groups";
import {
  findTaskInGroup,
  getTaskAudienceUserIds,
  pickAndRecordSpin,
  reviewTaskExplanation,
  validateAndBuildDailyTaskData,
  validateAndBuildDailyTaskEdit,
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
  redirect("/dashboard/my-group/tasks");
}

// A leader manages the tasks they authored for their own group, and only
// those. Anything an admin broadcast to several groups at once carries a
// batchId and belongs to the admin who sent it — a single group must not be
// able to reword or quietly drop an assignment everyone else received. Both
// mutations below run the same two gates, in the same order, so the failure
// messages stay identical whichever one the caller hits.
async function requireOwnManageableTask(taskId: string, groupId: string) {
  const task = await findTaskInGroup(taskId, groupId);
  if (!task) return { error: "Nhiệm vụ không tồn tại hoặc không thuộc nhóm của bạn." };
  if (!isTaskManageableByLeadership(task)) {
    return { error: "Nhiệm vụ này do ban quản trị giao — chỉ ban quản trị mới sửa hoặc gỡ được." };
  }
  return { task };
}

export async function updateDailyTaskAction(
  taskId: string,
  input: CreateDailyTaskInput
): Promise<string | undefined> {
  const { membership } = await requireOwnGroupLeadership();

  const gate = await requireOwnManageableTask(taskId, membership.groupId);
  if ("error" in gate) return gate.error;

  const result = await validateAndBuildDailyTaskEdit(membership.groupId, input);
  if ("error" in result) return result.error;

  // Clearing the old assignee rows and writing the new ones has to be one
  // unit: a task left with neither audience flag nor assignees would silently
  // apply to nobody.
  await prisma.$transaction([
    prisma.dailyTaskAssignee.deleteMany({ where: { taskId } }),
    prisma.dailyTask.update({
      where: { id: taskId },
      data: {
        ...result.edit.data,
        assignees: { create: result.edit.assigneeUserIds.map((userId) => ({ userId })) },
      },
    }),
  ]);

  revalidatePath("/dashboard/my-group");
  revalidatePath("/dashboard/my-group/tasks");
  redirect("/dashboard/my-group/tasks");
}

export async function deleteDailyTaskAction(taskId: string): Promise<string | undefined> {
  const { membership } = await requireOwnGroupLeadership();

  const gate = await requireOwnManageableTask(taskId, membership.groupId);
  if ("error" in gate) return gate.error;

  await prisma.dailyTask.delete({ where: { id: taskId } });

  revalidatePath("/dashboard/my-group");
  revalidatePath("/dashboard/my-group/tasks");
  return undefined;
}

export async function reviewExplanationAction(completionId: string, approve: boolean): Promise<string | undefined> {
  const { student, membership } = await requireOwnGroupLeadership();

  const error = await reviewTaskExplanation(completionId, membership.groupId, student.id, approve);
  if (error) return error;

  revalidatePath("/dashboard/my-group/explanations");
  revalidatePath("/dashboard/my-group");
  return undefined;
}
