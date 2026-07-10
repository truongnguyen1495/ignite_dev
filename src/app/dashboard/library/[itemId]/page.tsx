import { requireLibraryItemAccess } from "@/lib/access";
import { BackLink } from "@/components/ui/back-link";

export default async function LibraryItemReaderPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const { libraryItem } = await requireLibraryItemAccess(itemId);

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/dashboard/library">Thư viện</BackLink>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{libraryItem.title}</h1>
        {libraryItem.author && <p className="mt-1 text-sm text-muted">{libraryItem.author}</p>}
      </div>

      <iframe
        src={`/api/library/${itemId}/file`}
        className="h-[80vh] w-full rounded-xl border border-border"
        title={libraryItem.title}
      />
    </div>
  );
}
