import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { ReorderModal } from "@/components/ui/reorder-modal";
import { LibraryList, type LibraryListItem } from "./library-list";
import { reorderLibraryItemsAction } from "./actions";

export default async function LibraryPage() {
  await requireAdminPermission("MANAGE_LIBRARY");
  const items = await prisma.libraryItem.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      // grantedById: null = system-granted via a paid order, non-null = an
      // admin granted it by hand — split into two badges below.
      grants: { select: { grantedById: true } },
      levelGrants: { select: { minLevel: true }, orderBy: { minLevel: "asc" } },
    },
  });

  const listItems: LibraryListItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    description: item.description,
    type: item.type,
    coverImageUrl: item.coverImageUrl,
    pageCount: item.pageCount,
    price: item.price,
    salePrice: item.salePrice,
    manualGrantsCount: item.grants.filter((g) => g.grantedById !== null).length,
    purchasedGrantsCount: item.grants.filter((g) => g.grantedById === null).length,
    levelGrants: item.levelGrants.map((lg) => lg.minLevel),
    visibleToGuest: item.visibleToGuest,
    visibleToStudents: item.visibleToStudents,
    isFree: item.isFree,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thư viện"
        actions={
          <>
            <ReorderModal
              triggerLabel={
                <>
                  <ArrowUpDown className="h-4 w-4" />
                  Sắp xếp thứ tự
                </>
              }
              triggerClassName="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              title="Sắp xếp thư viện"
              items={listItems.map((i) => ({ id: i.id, label: i.title }))}
              onSave={reorderLibraryItemsAction}
            />
            <Link
              href="/admin/library/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Thêm sách / tài liệu
            </Link>
          </>
        }
      />

      <LibraryList items={listItems} />
    </div>
  );
}
