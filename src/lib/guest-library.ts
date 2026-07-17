import "server-only";
import type { User, LibraryItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLibraryItemAccessLevels, isSalesEnabled } from "@/lib/access";

export type GuestLibraryItem = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  type: LibraryItemType;
  coverImageUrl: string | null;
  guestPreviewPages: number | null;
  href: string;
  gradient: string;
  isFree: boolean;
  // True when this specific item is fully unlocked — via isFree for an
  // anonymous guest, or the real access level (grant/level rule/isFree) for
  // a logged-in student's home teaser. Distinct from isFree so the UI can
  // still show "Miễn phí" specifically vs a plain "Đã mở khóa" for access
  // granted some other way.
  fullyUnlocked: boolean;
  // Only meaningful for display when the card isn't already free/unlocked
  // and sales are actually on — same reasoning as GuestCourseItem's fields.
  price: number;
  salePrice: number | null;
  salesEnabled: boolean;
};

const BANNER_GRADIENTS = [
  "from-[var(--primary)] to-[var(--info)]",
  "from-[var(--level-3)] to-[var(--primary)]",
  "from-[var(--level-4)] to-[var(--warning)]",
  "from-[var(--info)] to-[var(--level-3)]",
  "from-[var(--level-5)] to-[var(--level-4)]",
];

// `student` switches this from the anonymous /guest/library catalog to a
// logged-in student's home-page "featured" teaser: hrefs point into
// /dashboard/library (their own, access-checked routes) instead of
// /guest/library, and "fully unlocked" is decided by their real access level
// (getLibraryItemAccessLevel — grant, level rule, or isFree) instead of just
// isFree. Every guest/home caller shares this one function so the catalogs
// can never drift apart the way they did before (see git history — this
// query used to be copy-pasted separately in three places).
export async function getGuestLibraryItems({
  onlyFeatured = false,
  student,
}: { onlyFeatured?: boolean; student?: User } = {}): Promise<GuestLibraryItem[]> {
  const items = await prisma.libraryItem.findMany({
    where: {
      visibleToGuest: true,
      visibleToStudents: true,
      ...(onlyFeatured ? { featuredOnHome: true } : {}),
      // A free item needs no trial content generated — it's read in full
      // instead (see requireGuestLibraryItemAccess in src/lib/access.ts).
      // INTERACTIVE has no previewFilePath at all (its preview is sliced
      // from guestPreviewPages at query time).
      OR: [
        { isFree: true },
        { format: "PDF", previewFilePath: { not: null } },
        { format: "INTERACTIVE", guestPreviewPages: { gt: 0 } },
      ],
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const basePath = student ? "/dashboard/library" : "/guest/library";

  // Batched (3 queries total) instead of one getLibraryItemAccessLevel call
  // per item — a per-item Promise.all fan-out here once blew through
  // DATABASE_URL's connection_limit=1 on /dashboard/home's featured teaser.
  const [accessLevels, salesEnabled] = await Promise.all([
    student ? getLibraryItemAccessLevels(student, items.map((item) => item.id)) : Promise.resolve(null),
    isSalesEnabled(),
  ]);

  return items.map((item, index) => {
    const fullyUnlocked = student ? accessLevels!.get(item.id) === "full" : item.isFree;
    return {
      id: item.id,
      title: item.title,
      author: item.author,
      description: item.description,
      type: item.type,
      coverImageUrl: item.coverImageUrl,
      guestPreviewPages: item.guestPreviewPages,
      href: `${basePath}/${item.id}`,
      gradient: BANNER_GRADIENTS[index % BANNER_GRADIENTS.length],
      isFree: item.isFree,
      fullyUnlocked,
      price: item.price,
      salePrice: item.salePrice,
      salesEnabled,
    };
  });
}
