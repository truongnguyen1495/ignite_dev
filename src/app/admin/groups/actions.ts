"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GroupRole } from "@prisma/client";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { CreateDailyTaskInput } from "@/lib/groups";
import { reviewTaskExplanation, validateAndBuildDailyTaskData } from "@/lib/group-data";

export async function createGroupAction(name: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const trimmed = name.trim();
  if (!trimmed) return "Vui lòng nhập tên nhóm.";

  const group = await prisma.group.create({ data: { name: trimmed } });
  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function addMemberAction(groupId: string, userId: string): Promise<string | undefined> {
  await requireAdminPermission("MANAGE_GROUPS");
  const existing = await prisma.groupMembership.findUnique({ where: { userId } });
  if (existing) return "Học viên này đã thuộc một nhóm khác.";

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
  if (fromGroupId === toGroupId) return "Học viên đã ở nhóm này rồi.";
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
