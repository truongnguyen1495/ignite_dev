import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadLibraryFile } from "@/lib/library-storage";
import { getPdfPageCount } from "@/lib/library-pdf";
import { matchesDeclaredMimeType } from "@/lib/file-signature";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

// Vendor counterpart to /api/admin/upload-library-file — see
// /api/vendor/upload-image's own comment for why this is a plain auth() +
// manual Vendor check rather than requireVendorAccountAccess().
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
    return NextResponse.json({ error: "Thiếu file PDF." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Chỉ hỗ trợ file PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File vượt quá giới hạn 50MB." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesDeclaredMimeType(bytes, "application/pdf")) {
      return NextResponse.json({ error: "Nội dung file không phải PDF hợp lệ." }, { status: 400 });
    }
    const pageCount = await getPdfPageCount(bytes);
    const path = `${crypto.randomUUID()}.pdf`;
    await uploadLibraryFile(bytes, path);
    return NextResponse.json({ path, pageCount });
  } catch (error) {
    console.error("Vendor library file upload failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Tải file lên thất bại: ${detail}` }, { status: 500 });
  }
}
