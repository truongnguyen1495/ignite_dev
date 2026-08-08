import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadUserAvatar } from "@/lib/supabase-avatar-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg"]);

// Unlike /api/admin/upload-image (gated to specific admin permissions), any
// active account uploads an avatar for itself — there's no "which content
// area" permission to check here, just "is this a live session." The client
// (AvatarCropInput) always sends an already-cropped 512x512 JPEG, so the
// type allowlist is narrower than the admin image endpoint's.
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
    return NextResponse.json({ error: "Định dạng ảnh không hợp lệ." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Ảnh vượt quá giới hạn 5MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredMimeType(bytes, file.type)) {
    return NextResponse.json({ error: "Nội dung file không khớp với định dạng ảnh đã khai báo." }, { status: 400 });
  }

  try {
    const url = await uploadUserAvatar(user.id, file);
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json({ error: "Tải ảnh lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
