import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentHasLibraryItemAccess } from "@/lib/access";
import { downloadLibraryFile } from "@/lib/library-storage";

// Serves the full PDF to an authenticated <iframe>. Plain auth() + manual
// checks instead of requireLibraryItemAccess()/requireActiveStudent(): those
// redirect on failure, which doesn't make sense for a route embedded as an
// iframe's src rather than navigated to directly. Same convention as
// /api/admin/upload-image and /api/admin/upload-library-file.
export async function GET(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  if (!libraryItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Super admins manage every item; students need an explicit grant/level rule.
  if (user.role === "STUDENT" && !(await studentHasLibraryItemAccess(user, itemId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = await downloadLibraryFile(libraryItem.filePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(libraryItem.title)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
