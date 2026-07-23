import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
import { uploadBookVideo } from "@/lib/library-book-video-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

// The bucket itself allows up to 50MB, but Vercel's own request-body limit
// for a Serverless Function (a few MB on the Hobby plan) rejects an
// oversized request before this route ever runs — same ceiling that broke
// large PDF uploads (see library-file-input.tsx). Video files are typically
// far bigger than a scanned PDF, so in practice only short/low-res clips
// will actually fit; anything longer should stay a YouTube link instead.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);

// Backs the video element's direct-upload option in the library book
// editor's property panel. Plain auth() + role check instead of
// requireAdminPermission(): that redirects to /login on failure, which a
// fetch()-driven upload can't act on sensibly — same convention as
// /api/admin/upload-book-audio.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasFullAdminAccess(user)) {
    const permissions = await getAdminPermissions(user.id);
    if (!permissions.has("MANAGE_LIBRARY")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file video." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ MP4, WebM hoặc OGG." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({
      error: `File ${(file.size / 1024 / 1024).toFixed(1)}MB vượt quá giới hạn ~4MB của server hiện tại. Video dài hơn nên dùng link YouTube thay vì tải file trực tiếp.`,
    }, { status: 400 });
  }
  // file.type is a client-supplied multipart header — never trust it alone.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredMimeType(bytes, file.type)) {
    return NextResponse.json({ error: "Nội dung file không khớp với định dạng video đã khai báo." }, { status: 400 });
  }

  try {
    const url = await uploadBookVideo(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Book video upload failed:", error);
    return NextResponse.json({ error: "Tải video lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
