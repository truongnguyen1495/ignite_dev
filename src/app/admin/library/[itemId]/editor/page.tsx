import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookEditor } from "./book-editor";

export default async function LibraryBookEditorPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  await requireAdminPermission("MANAGE_LIBRARY");
  const { itemId } = await params;

  const item = await prisma.libraryItem.findUnique({
    where: { id: itemId },
    include: { bookPages: { orderBy: { order: "asc" } } },
  });
  if (!item || item.format !== "INTERACTIVE") {
    notFound();
  }

  // Prisma's Json column comes back as unknown JsonValue — the DB rows were
  // only ever written by saveLibraryBookPagesAction (which validates via
  // bookPagesPayloadSchema before writing), so this cast is safe; the editor
  // itself re-validates the same way on every Save.
  const pages: BookPageData[] = item.bookPages.map((p) => ({
    backgroundColor: p.backgroundColor,
    backgroundImageUrl: p.backgroundImageUrl,
    elements: p.elements as BookPageData["elements"],
  }));

  return (
    <BookEditor
      libraryItemId={item.id}
      title={item.title}
      bookWidth={item.bookWidth ?? 800}
      bookHeight={item.bookHeight ?? 1131}
      initialPages={pages}
    />
  );
}
