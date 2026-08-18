import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/access";
import { uploadOrderProof } from "@/lib/order-proof-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Images only, unlike the chat uploader: this is a screenshot of a bank
// notification, and narrowing the set narrows what can be stored at all.
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Two-step, same shape as /api/chat/upload-attachment: this route only puts
// the bytes in the private bucket and hands back a path. Attaching that path
// to an order is the Server Action's job (confirmOrderPaidAction), which is
// also what re-checks the order is still confirmable — so an upload alone
// changes nothing about any order.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await hasAdminPermission(user, "MANAGE_ORDERS"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu tệp ảnh." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ nhận ảnh PNG, JPG hoặc WEBP." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Ảnh vượt quá giới hạn 10MB." }, { status: 400 });
  }

  try {
    // Never embeds the client-supplied filename — only a sanitized
    // extension, same reasoning as uploadChatAttachment: closes off "../"
    // traversal from ever reaching a storage path.
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    // file.type is a client-supplied multipart header; the download route
    // serves the bytes back under it, so it has to match the real content.
    if (!matchesDeclaredMimeType(bytes, file.type)) {
      return NextResponse.json({ error: "Nội dung tệp không khớp với định dạng đã khai báo." }, { status: 400 });
    }
    await uploadOrderProof(bytes, path, file.type);
    return NextResponse.json({ path, mime: file.type });
  } catch (error) {
    console.error("Payment proof upload failed:", error);
    return NextResponse.json({ error: "Tải ảnh lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
