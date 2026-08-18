import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { LibraryItemType } from "@prisma/client";
import { requireActiveStudent, isSalesEnabled, type LibraryAccessLevel } from "@/lib/access";
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

// Each shelf is a real route rather than a `?type=` query, because the sidebar
// decides which entry is highlighted from `pathname` alone — a query string is
// invisible to it, so both sub-entries would have stayed permanently unlit.
// Real paths also make a shelf shareable and bookmarkable.
const SHELVES: { href: string; label: string; type: LibraryItemType | null }[] = [
  { href: "/dashboard/library", label: "Tất cả", type: null },
  { href: "/dashboard/library/sach", label: "Sách / Ebook", type: "BOOK" },
  { href: "/dashboard/library/tai-lieu", label: "Tài liệu", type: "DOCUMENT" },
];

const DESCRIPTIONS: Record<string, string> = {
  all: "Sách và tài liệu — chỉ đọc được khi Super Admin cấp quyền riêng.",
  BOOK: "Sách và ebook trong thư viện.",
  DOCUMENT: "Tài liệu, biểu mẫu và văn bản trong thư viện.",
};

// One implementation behind /dashboard/library and its two shelves; the routes
// are three-line files that differ only by `type`.
export async function StudentLibraryView({
  type = null,
  denied = false,
}: {
  type?: LibraryItemType | null;
  denied?: boolean;
}) {
  const student = await requireActiveStudent();

  const [items, grants, levelGrants, salesEnabled] = await Promise.all([
    // visibleToStudents doubles as a master hide switch, same as announcements.
    prisma.libraryItem.findMany({
      where: { visibleToStudents: true, ...(type ? { type } : {}) },
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

  const listItems: StudentLibraryItem[] = items.map((item, index) => {
    let accessLevel: LibraryAccessLevel;
    if (item.isFree || grantedItemIds.has(item.id)) {
      accessLevel = "full";
    } else {
      accessLevel = levelUnlockedItemIds.has(item.id)
        ? "full"
        : item.visibleToGuest && item.previewFilePath
          ? "trial"
          : "none";
    }

    return {
      id: item.id,
      title: item.title,
      author: item.author,
      description: item.description,
      type: item.type,
      coverImageUrl: item.coverImageUrl,
      accessLevel,
      pageCount: item.pageCount,
      href: `/dashboard/library/${item.id}`,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
      price: item.price,
      salePrice: item.salePrice,
      isFree: item.isFree,
      salesEnabled,
    };
  });

  const activeShelf = SHELVES.find((s) => s.type === type) ?? SHELVES[0];

  return (
    <div className="space-y-6">
      {denied && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          Bạn không có quyền xem mục đó.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Thư viện</h1>
        <p className="mt-1 text-sm text-muted">{DESCRIPTIONS[type ?? "all"]}</p>
      </div>

      {/* Mirrors the two sidebar sub-entries so the shelves are switchable from
          inside the page too, not only from the menu. */}
      <div className="flex flex-wrap gap-2">
        {SHELVES.map((shelf) => {
          const isActive = shelf.href === activeShelf.href;
          return (
            <Link
              key={shelf.href}
              href={shelf.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary-border bg-primary-bg text-primary"
                  : "border-border-strong text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {shelf.label}
            </Link>
          );
        })}
      </div>

      {listItems.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Chưa có mục nào trong {activeShelf.label.toLowerCase()}.
        </p>
      ) : (
        <LibraryList items={listItems} />
      )}
    </div>
  );
}
