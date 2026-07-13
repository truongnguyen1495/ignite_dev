import { requireGuestLibraryItemAccess } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";
import { PdfReader } from "@/components/library/pdf-reader";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flags.
export const dynamic = "force-dynamic";

export default async function GuestLibraryItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const { libraryItem } = await requireGuestLibraryItemAccess(itemId);

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/guest/library">Thư viện</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{libraryItem.title}</h1>
        {libraryItem.author && <p className="mt-1 text-sm text-muted">{libraryItem.author}</p>}
        {libraryItem.guestPreviewPages && (
          <p className="mt-1 text-sm text-muted">
            Bản xem thử — {libraryItem.guestPreviewPages} trang đầu. Đăng ký để đọc toàn bộ.
          </p>
        )}
      </div>

      <PdfReader src={`/api/library/${itemId}/preview`} title={libraryItem.title} />
    </div>
  );
}
