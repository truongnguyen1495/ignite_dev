import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLibraryItemAccessLevel } from "@/lib/access";

// Serves an INTERACTIVE-format LibraryItem's pages as JSON to BookFlipbook —
// the equivalent of /file and /preview for PDF items, but unified into one
// route since there's no separate physical preview asset to pre-generate;
// trial access just slices to guestPreviewPages rows at query time. Plain
// auth() + manual checks, same convention as /file and /preview (this is
// fetched by a client component, not navigated to, so redirect-based guards
// don't apply).
export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;

  const libraryItem = await prisma.libraryItem.findUnique({ where: { id: itemId } });
  if (!libraryItem || libraryItem.format !== "INTERACTIVE") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  let accessLevel: "full" | "trial" | "none";

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "STUDENT") {
      if (!libraryItem.visibleToStudents) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      accessLevel = await getLibraryItemAccessLevel(user, itemId);
    } else {
      // Super admins manage every item, including hidden ones — same
      // convention as /file.
      accessLevel = "full";
    }
  } else {
    const hasTrialContent = libraryItem.visibleToGuest && (libraryItem.guestPreviewPages ?? 0) > 0;
    accessLevel = hasTrialContent && libraryItem.visibleToStudents ? "trial" : "none";
  }

  if (accessLevel === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pages = await prisma.libraryBookPage.findMany({
    where: { libraryItemId: itemId },
    orderBy: { order: "asc" },
    ...(accessLevel === "trial" ? { take: libraryItem.guestPreviewPages ?? 0 } : {}),
  });

  return NextResponse.json({
    pages,
    bookWidth: libraryItem.bookWidth,
    bookHeight: libraryItem.bookHeight,
    totalPages: libraryItem.pageCount ?? pages.length,
    backgroundImageUrl: libraryItem.backgroundImageUrl,
  });
}
