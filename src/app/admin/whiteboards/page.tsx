import { requireAnyAdminAccess, requireWhiteboardsEnabled } from "@/lib/access";
import { getWhiteboardsForUser } from "@/lib/whiteboards";
import { PageHeader } from "@/components/ui/page-header";
import { WhiteboardList, type WhiteboardListItem } from "./whiteboard-list";

export default async function WhiteboardsPage() {
  const { user: admin } = await requireAnyAdminAccess();
  await requireWhiteboardsEnabled("/admin?denied=1");

  const boards = await getWhiteboardsForUser(admin.id);

  const items: WhiteboardListItem[] = boards.map((board) => ({
    id: board.id,
    title: board.title,
    updatedAt: board.updatedAt.toISOString(),
    createdByName: board.createdBy?.name ?? null,
    lastEditedByName: board.lastEditedBy?.name ?? null,
    collaboratorCount: board._count.collaborators,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Bảng vẽ" description="Sơ đồ, mindmap, moodboard và ghi chú — của bạn hoặc được chia sẻ cho bạn." />
      <WhiteboardList items={items} />
    </div>
  );
}
