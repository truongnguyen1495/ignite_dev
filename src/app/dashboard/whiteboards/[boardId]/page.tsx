import { notFound } from "next/navigation";
import {
  requireActiveStudent,
  requireWhiteboardsEnabled,
  requireWhiteboardAccess,
  canManageWhiteboardSharing,
  canEditWhiteboard,
} from "@/lib/access";
import type { WhiteboardElement } from "@/lib/whiteboard-elements";
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor";
import { WhiteboardViewer } from "@/components/whiteboard/whiteboard-viewer";
import { saveMyWhiteboardAction, renameMyWhiteboardAction } from "../actions";

export default async function MyWhiteboardEditorPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  await requireActiveStudent();
  await requireWhiteboardsEnabled("/dashboard?denied=1");
  const { boardId } = await params;

  const access = await requireWhiteboardAccess(boardId, "/dashboard/whiteboards?denied=1");
  if (!access) {
    notFound();
  }
  const { board } = access;

  // Only ever written by saveMyWhiteboardAction, which validates via
  // whiteboardElementsPayloadSchema before writing — same trust convention
  // as the admin editor page's identical comment.
  const elements = board.elements as WhiteboardElement[];

  if (!canEditWhiteboard(access.role)) {
    return (
      <WhiteboardViewer
        boardId={board.id}
        title={board.title}
        initialElements={elements}
        initialViewport={{ x: board.viewportX, y: board.viewportY, zoom: board.viewportZoom }}
        backHref="/dashboard/whiteboards"
        currentUser={{ id: access.user.id, name: access.user.name }}
      />
    );
  }

  const canManageSharing = await canManageWhiteboardSharing(access.user, board);

  return (
    <WhiteboardEditor
      boardId={board.id}
      title={board.title}
      initialElements={elements}
      initialViewport={{ x: board.viewportX, y: board.viewportY, zoom: board.viewportZoom }}
      onSave={saveMyWhiteboardAction}
      onRename={renameMyWhiteboardAction}
      backHref="/dashboard/whiteboards"
      canManageSharing={canManageSharing}
      currentUser={{ id: access.user.id, name: access.user.name }}
    />
  );
}
