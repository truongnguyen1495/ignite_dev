import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
import { uploadBookAudio } from "@/lib/library-audio-storage";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4"]);

// Backs the audio element in the library book editor's property panel.
// Plain auth() + role check instead of requireAdminPermission(): that
// redirects to /login on failure, which a fetch()-driven upload can't act on
// sensibly — same convention as /api/admin/upload-image.
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
    return NextResponse.json({ error: "Thiếu file audio." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ MP3, WAV, OGG hoặc M4A." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File vượt quá giới hạn 15MB." }, { status: 400 });
  }

  try {
    const url = await uploadBookAudio(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Book audio upload failed:", error);
    return NextResponse.json({ error: "Tải audio lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
