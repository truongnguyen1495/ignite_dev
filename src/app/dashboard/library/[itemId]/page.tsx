import { requireLibraryItemAccess } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { PdfReader } from "@/components/library/pdf-reader";
import { BookReader } from "@/components/library/book-reader";

export default async function LibraryItemReaderPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const { libraryItem, accessLevel } = await requireLibraryItemAccess(itemId);
  const isTrial = accessLevel === "trial";

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/dashboard/library">Thư viện</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{libraryItem.title}</h1>
        {libraryItem.author && <p className="mt-1 text-sm text-muted">{libraryItem.author}</p>}
        {isTrial && libraryItem.guestPreviewPages && (
          <p className="mt-1 text-sm text-muted">
            Bản xem thử — {libraryItem.guestPreviewPages} trang đầu. Mua để đọc toàn bộ.
          </p>
        )}
      </div>

      {libraryItem.format === "INTERACTIVE" ? (
        <BookReader itemId={itemId} title={libraryItem.title} />
      ) : (
        <PdfReader
          src={`/api/library/${itemId}/${isTrial ? "preview" : "file"}`}
          title={libraryItem.title}
          backgroundImageUrl={libraryItem.backgroundImageUrl}
        />
      )}
    </div>
  );
}
