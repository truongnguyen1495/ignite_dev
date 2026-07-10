import { prisma } from "@/lib/prisma";
import { GuestLibraryList, type GuestLibraryItem } from "./library-list";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flags.
export const dynamic = "force-dynamic";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function GuestLibraryPage() {
  // Guests only ever see items with a generated preview to actually read.
  const items = await prisma.libraryItem.findMany({
    where: { visibleToGuest: true, previewFilePath: { not: null } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const listItems: GuestLibraryItem[] = items.map((item, index) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    description: item.description,
    type: item.type,
    coverImageUrl: item.coverImageUrl,
    guestPreviewPages: item.guestPreviewPages,
    gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Thư viện</h1>
        <p className="mt-1 text-sm text-muted">Đọc thử sách và tài liệu công khai — không cần đăng nhập.</p>
      </div>

      <GuestLibraryList items={listItems} />
    </div>
  );
}
