import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCanAccessChatThread, isChatEnabled } from "@/lib/access";
import { downloadChatAttachment } from "@/lib/chat-storage";

// Plain auth() + manual checks instead of the redirect-based requireXxx
// helpers in access.ts — this route is embedded/linked as a download target,
// not navigated to as a page, so failures need a JSON response. Mirrors
// /api/library/[itemId]/file.
export async function GET(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await isChatEnabled())) {
    return NextResponse.json({ error: "Chat is disabled" }, { status: 403 });
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { thread: true },
  });
  if (!message || !message.attachmentPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!userCanAccessChatThread(user, message.thread)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = await downloadChatAttachment(message.attachmentPath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": message.attachmentMime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(message.attachmentName ?? "attachment")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
