"use server";

import { revalidatePath } from "next/cache";
import type { Role, WhiteboardAccessRole } from "@prisma/client";
import { requireWhiteboardAccess, canManageWhiteboardSharing } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Shared by both the admin and student whiteboard routes (unlike board
// create/rename/delete/save, which stay as separate thin per-route action
// files since their gating differs) — collaborator management is genuinely
// identical either way once requireWhiteboardAccess/canManageWhiteboardSharing
// already unify the per-board rule, so one shared module here avoids two
// copies of the same logic drifting apart. Lives in src/lib (not under
// either route's app/ folder), same convention as access.ts itself.

// A denied-access redirect target here matters little in practice — every
// function below is called from an already-open editor (the Share button
// only ever renders once a board has successfully loaded), so a request
// that fails requireWhiteboardAccess entirely means someone is calling this
// directly with a board id they never legitimately opened. The admin list
// is just a safe, always-valid fallback destination for that edge case.
const FALLBACK_DENIED_REDIRECT = "/admin/whiteboards?denied=1";

async function requireManageAccess(boardId: string) {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return null;
  if (!(await canManageWhiteboardSharing(access.user, access.board))) return null;
  return access;
}

export type WhiteboardCollaboratorItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  // The person's own account type (STUDENT/SUPER_ADMIN) — display only (the
  // little "Học viên"/"Admin" badge). NOT the same thing as `shareRole`
  // below, which is what THIS BOARD grants them.
  accountRole: Role;
  shareRole: WhiteboardAccessRole;
  avatarUrl: string | null;
};

export type WhiteboardUserSearchResult = {
  id: string;
  name: string;
  email: string;
  accountRole: Role;
  avatarUrl: string | null;
};

export type WhiteboardShareInfo = {
  collaborators: WhiteboardCollaboratorItem[];
  generalAccessRole: WhiteboardAccessRole | null;
};

async function listCollaborators(boardId: string): Promise<WhiteboardCollaboratorItem[]> {
  const rows = await prisma.whiteboardCollaborator.findMany({
    where: { whiteboardId: boardId },
    include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    orderBy: { addedAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    accountRole: row.user.role,
    shareRole: row.role,
    avatarUrl: row.user.avatarUrl,
  }));
}

// Read-only — any user who can already open the board (owner or
// collaborator) may see who else has access, even though only
// requireManageAccess's narrower rule can add/remove/change roles.
export async function getWhiteboardShareInfoAction(boardId: string): Promise<WhiteboardShareInfo> {
  const access = await requireWhiteboardAccess(boardId, FALLBACK_DENIED_REDIRECT);
  if (!access) return { collaborators: [], generalAccessRole: null };
  const [collaborators] = await Promise.all([listCollaborators(boardId)]);
  return { collaborators, generalAccessRole: access.board.generalAccessRole };
}

export async function searchUsersForWhiteboardShareAction(
  boardId: string,
  query: string
): Promise<WhiteboardUserSearchResult[]> {
  const access = await requireManageAccess(boardId);
  if (!access) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const existing = await prisma.whiteboardCollaborator.findMany({
    where: { whiteboardId: boardId },
    select: { userId: true },
  });
  const excludeIds = [access.board.createdById, access.user.id, ...existing.map((row) => row.userId)].filter(
    (id): id is string => !!id
  );

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: excludeIds },
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    take: 20,
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, accountRole: u.role, avatarUrl: u.avatarUrl }));
}

function revalidateBoth(boardId: string) {
  revalidatePath(`/admin/whiteboards/${boardId}`);
  revalidatePath(`/dashboard/whiteboards/${boardId}`);
}

export type WhiteboardShareMutationResult = {
  error?: string;
  // Present on success — the caller applies this directly to its local
  // state instead of firing a SEPARATE getWhiteboardShareInfoAction round
  // trip afterward. That second-call approach was tried first and turned
  // out to be unreliable: a server action that calls revalidatePath for the
  // exact route currently being viewed makes Next.js fold a fresh RSC
  // payload into that SAME action's response, and a second action call
  // dispatched immediately after (before that response settles) was
  // observed to silently never reach the server — returning the fresh
  // state straight from THIS action sidesteps the race entirely, and is
  // simply one fewer round trip too.
  info?: WhiteboardShareInfo;
};

async function currentShareInfo(boardId: string, generalAccessRole: WhiteboardAccessRole | null): Promise<WhiteboardShareInfo> {
  return { collaborators: await listCollaborators(boardId), generalAccessRole };
}

// New adds default to EDITOR (not the enum's first-declared VIEWER) —
// least surprising given every collaborator added before per-role sharing
// existed was implicitly an editor; the row's role can be changed
// immediately afterward via updateWhiteboardCollaboratorRoleAction.
export async function addWhiteboardCollaboratorAction(boardId: string, userId: string): Promise<WhiteboardShareMutationResult> {
  const access = await requireManageAccess(boardId);
  if (!access) {
    return { error: "Bạn không có quyền chia sẻ bảng vẽ này." };
  }
  await prisma.whiteboardCollaborator.upsert({
    where: { whiteboardId_userId: { whiteboardId: boardId, userId } },
    create: { whiteboardId: boardId, userId, addedById: access.user.id, role: "EDITOR" },
    update: {},
  });
  revalidateBoth(boardId);
  return { info: await currentShareInfo(boardId, access.board.generalAccessRole) };
}

export async function removeWhiteboardCollaboratorAction(
  boardId: string,
  collaboratorId: string
): Promise<WhiteboardShareMutationResult> {
  const access = await requireManageAccess(boardId);
  if (!access) {
    return { error: "Bạn không có quyền chia sẻ bảng vẽ này." };
  }
  await prisma.whiteboardCollaborator.deleteMany({ where: { id: collaboratorId, whiteboardId: boardId } });
  revalidateBoth(boardId);
  return { info: await currentShareInfo(boardId, access.board.generalAccessRole) };
}

export async function updateWhiteboardCollaboratorRoleAction(
  boardId: string,
  collaboratorId: string,
  role: WhiteboardAccessRole
): Promise<WhiteboardShareMutationResult> {
  const access = await requireManageAccess(boardId);
  if (!access) {
    return { error: "Bạn không có quyền chia sẻ bảng vẽ này." };
  }
  await prisma.whiteboardCollaborator.updateMany({ where: { id: collaboratorId, whiteboardId: boardId }, data: { role } });
  revalidateBoth(boardId);
  return { info: await currentShareInfo(boardId, access.board.generalAccessRole) };
}

// role = null switches general access back to "Hạn chế" (restricted to the
// named people above) — see Whiteboard.generalAccessRole's own schema
// comment for what a non-null value means.
export async function setWhiteboardGeneralAccessAction(
  boardId: string,
  role: WhiteboardAccessRole | null
): Promise<WhiteboardShareMutationResult> {
  const access = await requireManageAccess(boardId);
  if (!access) {
    return { error: "Bạn không có quyền chia sẻ bảng vẽ này." };
  }
  await prisma.whiteboard.update({ where: { id: boardId }, data: { generalAccessRole: role } });
  revalidateBoth(boardId);
  return { info: await currentShareInfo(boardId, role) };
}
