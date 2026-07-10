import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryList, type LibraryListItem } from "./library-list";

export default async function LibraryPage() {
  const items = await prisma.libraryItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { grants: true } },
      levelGrants: { select: { minLevel: true }, orderBy: { minLevel: "asc" } },
    },
  });

  const listItems: LibraryListItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    type: item.type,
    coverImageUrl: item.coverImageUrl,
    pageCount: item.pageCount,
    grantsCount: item._count.grants,
    levelGrants: item.levelGrants.map((lg) => lg.minLevel),
    visibleToGuest: item.visibleToGuest,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thư viện"
        actions={
          <Link
            href="/admin/library/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Thêm sách / tài liệu
          </Link>
        }
      />

      <LibraryList items={listItems} />
    </div>
  );
}
