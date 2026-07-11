import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isChatEnabled } from "@/lib/access";
import { uploadChatAttachment } from "@/lib/chat-storage";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "text/plain",
]);

// Plain auth() + status check, no role restriction — both students and
// admins send chat messages. Uploads a file to the private chat-attachments
// bucket and returns a reference; the message itself (and the access check
// tying that reference to a specific thread) is created separately by the
// relevant send-message server action, same two-step flow as
// /api/admin/upload-image + the lesson image extension.
export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu tệp đính kèm." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Định dạng tệp không được hỗ trợ." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Tệp vượt quá giới hạn 10MB." }, { status: 400 });
  }

  try {
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadChatAttachment(bytes, path, file.type);
    return NextResponse.json({ path, name: file.name, mime: file.type, size: file.size });
  } catch (error) {
    console.error("Chat attachment upload failed:", error);
    return NextResponse.json({ error: "Tải tệp lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
