import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadLessonImage } from "@/lib/supabase-storage";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Vendor counterpart to /api/admin/upload-image — a vendor account holds no
// AdminPermissionKind grant, so it needs its own gate: an APPROVED Vendor row
// on the caller's own account. Plain auth() + manual checks rather than
// requireVendorAccountAccess(), same reasoning as every other upload route in
// this app: that helper redirects on failure, which a fetch()-driven upload
// can't act on sensibly.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id }, select: { applicationStatus: true } });
  if (!vendor || vendor.applicationStatus !== "APPROVED") {
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
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesDeclaredMimeType(bytes, file.type)) {
    return NextResponse.json({ error: "Nội dung file không khớp với định dạng ảnh đã khai báo." }, { status: 400 });
  }

  try {
    const url = await uploadLessonImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Vendor image upload failed:", error);
    return NextResponse.json({ error: "Tải ảnh lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
