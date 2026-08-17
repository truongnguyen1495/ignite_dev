"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GroupRole } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { CreateDailyTaskInput } from "@/lib/groups";
import {
  findTaskInGroup,
  reviewTaskExplanation,
  validateAndBuildBulkDailyTaskData,
  validateAndBuildDailyTaskData,
  validateAndBuildDailyTaskEdit,
  validateBulkDailyTaskEdit,
} from "@/lib/group-data";

export async function createGroupAction(name: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const trimmed = name.trim();
  if (!trimmed) return "Vui lòng nhập tên nhóm.";

  const group = await prisma.group.create({ data: { name: trimmed } });
  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function renameGroupAction(groupId: string, name: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const trimmed = name.trim();
  if (!trimmed) return "Vui lòng nhập tên nhóm.";

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) return "Nhóm không tồn tại hoặc đã bị xoá — hãy tải lại trang.";
  if (group.name === trimmed) return undefined;

  await prisma.group.update({ where: { id: groupId }, data: { name: trimmed } });
  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

// Deleting a group cascades far past the group row itself: every membership,
// every DailyTask the group ever had, and through those every
// DailyTaskCompletion — the whole completion and explanation history of
// everyone in it. `confirmName` is the name the admin re-typed in the
// dialog; it's re-checked here rather than trusted from the client because a
// Server Action is reachable by direct POST, not only through our own UI.
export async function deleteGroupAction(groupId: string, confirmName: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) return "Nhóm không tồn tại hoặc đã bị xoá — hãy tải lại trang.";
  if (confirmName.trim() !== group.name) {
    return "Tên xác nhận không khớp với tên nhóm.";
  }

  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath("/admin/groups");
  return undefined;
}

export async function addMemberAction(groupId: string, userId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const existing = await prisma.groupMembership.findUnique({ where: { userId } });
  if (existing) return "Thành viên này đã thuộc một nhóm khác.";

  await prisma.groupMembership.create({ data: { groupId, userId, role: "MEMBER" } });
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

// Every mutation below takes both `membershipId` and the groupId the caller
// was looking at when they clicked — verifying the row actually belongs to
// that group before touching it isn't a privilege concern (MANAGE_GROUPS
// already grants access to every group), but it stops a stale/mismatched id
// from silently mutating the wrong group's membership and revalidating the
// wrong page's cache.
async function assertMembershipInGroup(membershipId: string, groupId: string) {
  const membership = await prisma.groupMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.groupId !== groupId) {
    return "Thành viên này không thuộc nhóm đang xem — hãy tải lại trang.";
  }
  return null;
}

export async function removeMemberAction(membershipId: string, groupId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const error = await assertMembershipInGroup(membershipId, groupId);
  if (error) return error;

  await prisma.groupMembership.delete({ where: { id: membershipId } });
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

export async function changeMemberRoleAction(
  membershipId: string,
  groupId: string,
  role: GroupRole
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const error = await assertMembershipInGroup(membershipId, groupId);
  if (error) return error;

  await prisma.groupMembership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

export async function transferMemberAction(
  membershipId: string,
  fromGroupId: string,
  toGroupId: string
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  if (fromGroupId === toGroupId) return "Thành viên đã ở nhóm này rồi.";
  const error = await assertMembershipInGroup(membershipId, fromGroupId);
  if (error) return error;

  await prisma.groupMembership.update({
    where: { id: membershipId },
    // Reset to MEMBER on transfer — the old group's leadership assignment
    // shouldn't silently carry over to a group this person had no role in.
    data: { groupId: toGroupId, role: "MEMBER" },
  });
  revalidatePath(`/admin/groups/${fromGroupId}`);
  revalidatePath(`/admin/groups/${toGroupId}`);
  return undefined;
}

export async function adminCreateDailyTaskAction(groupId: string, input: CreateDailyTaskInput): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_GROUPS");

  const result = await validateAndBuildDailyTaskData(groupId, input, admin.id);
  if ("error" in result) return result.error;

  await prisma.dailyTask.create({ data: result.data });

  revalidatePath(`/admin/groups/${groupId}`);
  redirect(`/admin/groups/${groupId}`);
}

export async function bulkCreateDailyTaskAction(
  groupIds: string[],
  input: CreateDailyTaskInput
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_GROUPS");

  const result = await validateAndBuildBulkDailyTaskData(groupIds, input, admin.id);
  if ("error" in result) return result.error;

  const { rows, groupCount, memberCount } = result.plan;
  // One statement for all copies — they share a batchId, so a partial insert
  // would leave a half-sent assignment that looks complete in the UI.
  await prisma.dailyTask.createMany({ data: rows });

  revalidatePath("/admin/groups");
  for (const row of rows) revalidatePath(`/admin/groups/${row.groupId}`);
  redirect(`/admin/groups?assigned=${groupCount}&members=${memberCount}`);
}

// Edits one group's copy of a task. An admin may edit any task, including a
// copy that came from a bulk assignment — unlike the group's own
// LEADER/DEPUTY, who are limited to what they authored themselves (see
// requireOwnManageableTask in dashboard/my-group/actions.ts).
export async function adminUpdateDailyTaskAction(
  groupId: string,
  taskId: string,
  input: CreateDailyTaskInput
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");

  const task = await findTaskInGroup(taskId, groupId);
  if (!task) return "Nhiệm vụ không tồn tại hoặc không thuộc nhóm đang xem — hãy tải lại trang.";

  const result = await validateAndBuildDailyTaskEdit(groupId, input);
  if ("error" in result) return result.error;

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

  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  redirect(`/admin/groups/${groupId}`);
}

// Edits every group's copy of one bulk assignment in a single statement — the
// other half of what batchId exists for. Audience is untouched on purpose: a
// bulk assignment always targets whole groups, so there is no per-group
// assignee list to keep in sync.
export async function updateTaskBatchAction(
  groupId: string,
  batchId: string,
  input: CreateDailyTaskInput
): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");

  const siblings = await prisma.dailyTask.findMany({ where: { batchId }, select: { groupId: true } });
  if (siblings.length === 0) return "Đợt giao việc này không còn tồn tại — hãy tải lại trang.";

  const result = validateBulkDailyTaskEdit(input);
  if ("error" in result) return result.error;

  await prisma.dailyTask.updateMany({ where: { batchId }, data: result.data });

  revalidatePath("/admin/groups");
  for (const affected of new Set(siblings.map((s) => s.groupId))) {
    revalidatePath(`/admin/groups/${affected}`);
  }
  redirect(`/admin/groups/${groupId}`);
}

// Removes one group's copy of a task. `groupId` leads on every task action
// here for the same reason it does on adminReviewExplanationAction below: it
// lets a Server Component bind the group once and hand the rest to the shared
// GroupTasksPanel, which knows nothing about groups.
export async function deleteDailyTaskAction(groupId: string, taskId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");

  const task = await findTaskInGroup(taskId, groupId);
  if (!task) return "Nhiệm vụ không tồn tại hoặc không thuộc nhóm đang xem — hãy tải lại trang.";

  await prisma.dailyTask.delete({ where: { id: taskId } });
  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

// Removes every group's copy of one bulk assignment at once — the reason
// batchId exists. `groupId` is only the page to send back to; the delete
// itself is scoped by batchId across all groups it reached.
export async function deleteTaskBatchAction(groupId: string, batchId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");

  const siblings = await prisma.dailyTask.findMany({
    where: { batchId },
    select: { groupId: true },
  });
  if (siblings.length === 0) return "Đợt giao việc này không còn tồn tại — hãy tải lại trang.";

  await prisma.dailyTask.deleteMany({ where: { batchId } });

  revalidatePath("/admin/groups");
  for (const groupIdToRefresh of new Set(siblings.map((s) => s.groupId))) {
    revalidatePath(`/admin/groups/${groupIdToRefresh}`);
  }
  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}

// `groupId` comes first (unlike adminCreateDailyTaskAction's own (groupId,
// input) order being a coincidence) specifically so a Server Component can
// do `adminReviewExplanationAction.bind(null, groupId)` and hand the result
// to the shared <ExplanationCard action={...}> — which expects a plain
// (completionId, approve) => Promise<string | undefined> — without an inline
// closure (a Server Component can't pass a non-action arrow function across
// the Client Component boundary, only actual bound Server Action references).
export async function adminReviewExplanationAction(
  groupId: string,
  completionId: string,
  approve: boolean
): Promise<string | undefined> {
  const admin = await requireAdminPermission("MANAGE_GROUPS");

  const error = await reviewTaskExplanation(completionId, groupId, admin.id, approve);
  if (error) return error;

  revalidatePath(`/admin/groups/${groupId}`);
  return undefined;
}
