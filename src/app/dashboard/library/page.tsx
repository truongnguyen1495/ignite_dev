import { AlertTriangle } from "lucide-react";
import { requireActiveStudent, isSalesEnabled } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasLevelAccess } from "@/lib/levels";
import { LibraryList, type StudentLibraryItem } from "./library-list";

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

export default async function StudentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const student = await requireActiveStudent();
  const { denied } = await searchParams;

  const [items, grants, levelGrants, salesEnabled] = await Promise.all([
    // visibleToStudents doubles as a master hide switch, same as announcements.
    prisma.libraryItem.findMany({
      where: { visibleToStudents: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    prisma.libraryAccessGrant.findMany({ where: { studentId: student.id } }),
    prisma.libraryLevelGrant.findMany(),
    isSalesEnabled(),
  ]);

  const grantedItemIds = new Set(grants.map((g) => g.libraryItemId));
  const levelUnlockedItemIds = new Set(
    levelGrants
      .filter((lg) => hasLevelAccess(student.grantedLevel, lg.minLevel))
      .map((lg) => lg.libraryItemId)
  );

  const listItems: StudentLibraryItem[] = items.map((item, index) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    description: item.description,
    type: item.type,
    coverImageUrl: item.coverImageUrl,
    unlocked: grantedItemIds.has(item.id) || levelUnlockedItemIds.has(item.id),
    pageCount: item.pageCount,
    href: `/dashboard/library/${item.id}`,
    gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
    price: item.price,
    salesEnabled,
  }));

  return (
    <div className="space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem mục đó.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Thư viện</h1>
        <p className="mt-1 text-sm text-muted">Sách và tài liệu — chỉ đọc được khi Super Admin cấp quyền riêng.</p>
      </div>

      <LibraryList items={listItems} />
    </div>
  );
}
