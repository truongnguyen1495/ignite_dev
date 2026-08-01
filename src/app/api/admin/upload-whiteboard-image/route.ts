import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadWhiteboardImage } from "@/lib/whiteboard-image-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Gated by "any active logged-in account, either role" — NOT tied to
// per-board edit access or any admin permission (this app has no
// MANAGE_WHITEBOARDS permission, unlike Kian_project). This endpoint only
// ever returns an uploaded file's URL; it never touches a board record, so
// the real per-board edit gate happens when the client later calls
// saveWhiteboardAction/saveMyWhiteboardAction with the new element included.
// Plain auth() + status check instead of requireAnyActiveAccount(): that
// helper redirects to /login on failure, which a fetch()-driven upload
// can't act on sensibly — this route needs a JSON error response instead
// (same convention as /api/admin/upload-image).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Ảnh vượt quá giới hạn 5MB." }, { status: 400 });
  }
  // file.type is a client-supplied multipart header — never trust it alone.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredMimeType(bytes, file.type)) {
    return NextResponse.json({ error: "Nội dung file không khớp với định dạng ảnh đã khai báo." }, { status: 400 });
  }

  try {
    const url = await uploadWhiteboardImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Whiteboard image upload failed:", error);
    return NextResponse.json({ error: "Tải ảnh lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
