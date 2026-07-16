import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminPermissions, hasFullAdminAccess } from "@/lib/access";
import { uploadLibraryFile } from "@/lib/library-storage";
import { getPdfPageCount } from "@/lib/library-pdf";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

// Plain auth() + role check instead of requireActiveSuperAdmin(): that
// helper redirects to /login on failure, which a fetch()-driven upload
// can't act on sensibly — this route needs a JSON error response instead.
// Same convention as /api/admin/upload-image.
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
    const pageCount = await getPdfPageCount(bytes);
    const path = `${crypto.randomUUID()}.pdf`;
    await uploadLibraryFile(bytes, path);
    return NextResponse.json({ path, pageCount });
  } catch (error) {
    console.error("Library file upload failed:", error);
    return NextResponse.json({ error: "Tải file lên thất bại. Vui lòng thử lại." }, { status: 500 });
  }
}
