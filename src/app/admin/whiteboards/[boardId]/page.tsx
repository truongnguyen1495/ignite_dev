import { notFound } from "next/navigation";
import { requireWhiteboardAccess, canManageWhiteboardSharing, canEditWhiteboard } from "@/lib/access";
import type { WhiteboardElement } from "@/lib/whiteboard-elements";
import { getWhiteboardCommentThreadsAction } from "@/lib/whiteboard-comment-actions";
import { WhiteboardEditor } from "@/components/whiteboard/whiteboard-editor";
import { WhiteboardViewer } from "@/components/whiteboard/whiteboard-viewer";
import { saveWhiteboardAction, renameWhiteboardAction } from "../actions";

export default async function WhiteboardEditorPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  const access = await requireWhiteboardAccess(boardId, "/admin/whiteboards?denied=1");
  if (!access) {
    notFound();
  }
  const { board } = access;

  // Only ever written by saveWhiteboardAction, which validates via
  // whiteboardElementsPayloadSchema before writing — same trust convention
  // as the book editor's bookPages cast.
  const elements = board.elements as WhiteboardElement[];
  const initialCommentThreads = await getWhiteboardCommentThreadsAction(boardId);

  if (!canEditWhiteboard(access.role)) {
    return (
      <WhiteboardViewer
        boardId={board.id}
        title={board.title}
        initialElements={elements}
        initialViewport={{ x: board.viewportX, y: board.viewportY, zoom: board.viewportZoom }}
        initialCommentThreads={initialCommentThreads}
        backHref="/admin/whiteboards"
        currentUser={{ id: access.user.id, name: access.user.name, avatarUrl: access.user.avatarUrl }}
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
      initialCommentThreads={initialCommentThreads}
      onSave={saveWhiteboardAction}
      onRename={renameWhiteboardAction}
      backHref="/admin/whiteboards"
      canManageSharing={canManageSharing}
      currentUser={{ id: access.user.id, name: access.user.name, avatarUrl: access.user.avatarUrl }}
    />
  );
}
