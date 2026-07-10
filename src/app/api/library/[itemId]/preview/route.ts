import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadLibraryFile } from "@/lib/library-storage";

// Public — no session at all, mirroring the guest/* pages this backs.
// Guests only ever receive previewFilePath's bytes, never filePath.
export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;

  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  if (
    !libraryItem ||
    !libraryItem.visibleToGuest ||
    !libraryItem.previewFilePath ||
    !libraryItem.visibleToStudents
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await downloadLibraryFile(libraryItem.previewFilePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(libraryItem.title)}-preview.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
