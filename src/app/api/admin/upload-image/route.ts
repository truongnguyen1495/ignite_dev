import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadLessonImage } from "@/lib/supabase-storage";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Plain auth() + role check instead of requireActiveSuperAdmin(): that
// helper redirects to /login on failure, which a fetch()-driven upload
// can't act on sensibly — this route needs a JSON error response instead.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE" || user.role !== "SUPER_ADMIN") {
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

  try {
    const url = await uploadLessonImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Lesson image upload failed:", error);
    return NextResponse.json({ error: "Tải ảnh lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
