import { requireActiveStudent, requireWhiteboardsEnabled } from "@/lib/access";
import { getWhiteboardsForUser } from "@/lib/whiteboards";
import { PageHeader } from "@/components/ui/page-header";
import { MyWhiteboardList, type MyWhiteboardListItem } from "./whiteboard-list";

export default async function MyWhiteboardsPage() {
  const student = await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");

  const boards = await getWhiteboardsForUser(student.id);

  const items: MyWhiteboardListItem[] = boards.map((board) => ({
    id: board.id,
    title: board.title,
    updatedAt: board.updatedAt.toISOString(),
    isOwner: board.createdById === student.id,
    ownerName: board.createdBy?.name ?? null,
    lastEditedByName: board.lastEditedBy?.name ?? null,
    collaboratorCount: board._count.collaborators,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Bảng vẽ" description="Sơ đồ, mindmap, moodboard và ghi chú của riêng bạn, hoặc được chia sẻ cho bạn." />
      <MyWhiteboardList items={items} />
    </div>
  );
}
