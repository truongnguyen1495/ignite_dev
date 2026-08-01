import "server-only";
import { prisma } from "@/lib/prisma";

// Shared by both /admin/whiteboards and /dashboard/whiteboards list pages —
// the query is now identical for every audience (unlike Kian_project's admin
// side, which lists every board in the whole app for anyone holding
// MANAGE_WHITEBOARDS; that permission doesn't exist here, so an Admin's
// board list is exactly as scoped as a student's): boards this user created,
// plus boards they were explicitly added to as a WhiteboardCollaborator —
// either by a direct share or by having previously opened a
// generalAccessRole link (see requireWhiteboardAccess in src/lib/access.ts,
// which auto-upserts that collaborator row the first time that happens).
export async function getWhiteboardsForUser(userId: string) {
  return prisma.whiteboard.findMany({
    where: {
      OR: [{ createdById: userId }, { collaborators: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      lastEditedBy: { select: { name: true } },
      _count: { select: { collaborators: true } },
    },
  });
}

export type WhiteboardForUser = Awaited<ReturnType<typeof getWhiteboardsForUser>>[number];
