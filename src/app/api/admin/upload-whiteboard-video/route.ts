import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadWhiteboardVideo } from "@/lib/whiteboard-video-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

// Vercel serverless body-size limit, not a bug — a longer video should use a
// YouTube link instead of a direct upload. See whiteboard-video-storage.ts's
// own comment for why the underlying Supabase bucket is still configured
// for up to 50MB.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4"]);

// Same "any active logged-in account, either role" gate as
// upload-whiteboard-image — see that route's comment for why.
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
    return NextResponse.json({ error: "Thiếu file video." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ MP4 (H.264) — định dạng WebM/OGG không phát được trên iPhone/iPad/Safari." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({
      error: `File ${(file.size / 1024 / 1024).toFixed(1)}MB vượt quá giới hạn ~4MB của server hiện tại. Video dài hơn nên dùng link YouTube thay vì tải file trực tiếp.`,
    }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredMimeType(bytes, file.type)) {
    return NextResponse.json({ error: "Nội dung file không khớp với định dạng video đã khai báo." }, { status: 400 });
  }

  try {
    const url = await uploadWhiteboardVideo(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Whiteboard video upload failed:", error);
    return NextResponse.json({ error: "Tải video lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
