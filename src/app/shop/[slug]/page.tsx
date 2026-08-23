import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Mail, Package, GraduationCap, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveStudentOrNull, getVisibleProductIds, getCourseAccessLevels, getLibraryItemAccessLevels } from "@/lib/access";
import { isVendorActive } from "@/lib/vendor";
import { getPricing } from "@/lib/pricing";
import { formatVND } from "@/lib/currency";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";

type CatalogCard = {
  id: string;
  kind: "PRODUCT" | "COURSE" | "LIBRARY_ITEM";
  title: string;
  coverImageUrl: string | null;
  price: number;
  salePrice: number | null;
  href: string;
};

export default async function VendorStorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const vendor = await prisma.vendor.findUnique({ where: { slug } });
  // Deliberately the same notFound() for "no such slug" and "slug resolves
  // to a vendor that is PENDING/REJECTED/paused/suspended" — a working URL
  // that just renders an empty shell would still confirm the vendor exists,
  // which is exactly what a suspended vendor's storefront must not do.
  if (!vendor || !isVendorActive(vendor)) {
    notFound();
  }

  const student = await getActiveStudentOrNull();

  const [products, courses, libraryItems] = await prisma.$transaction([
    prisma.product.findMany({
      where: { sellerId: vendor.id, vendorHiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, imageUrl: true, price: true, salePrice: true, hiddenFromGuest: true },
    }),
    prisma.course.findMany({
      where: { sellerId: vendor.id, vendorHiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, coverImageUrl: true, price: true, salePrice: true, hiddenFromGuest: true },
    }),
    prisma.libraryItem.findMany({
      where: { sellerId: vendor.id, vendorHiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, coverImageUrl: true, price: true, salePrice: true, visibleToStudents: true },
    }),
  ]);

  // Product visibility works for an anonymous visitor directly (student may
  // be null); Course/LibraryItem's access-level functions need a real
  // student, so an anonymous visitor falls back to the same base
  // hiddenFromGuest/visibleToStudents fields those functions themselves
  // check before ever getting to grants/level rules — not a separate
  // re-derivation of the vendor-aware part, which the initial isVendorActive
  // gate above already covers for every item on this single-vendor page.
  const visibleProductIds = await getVisibleProductIds(student, products.map((p) => p.id));
  const courseLevels = student ? await getCourseAccessLevels(student, courses.map((c) => c.id)) : null;
  const libraryLevels = student ? await getLibraryItemAccessLevels(student, libraryItems.map((l) => l.id)) : null;

  const cards: CatalogCard[] = [
    ...products
      .filter((p) => visibleProductIds.has(p.id))
      .map((p) => ({
        id: p.id,
        kind: "PRODUCT" as const,
        title: p.title,
        coverImageUrl: p.imageUrl,
        price: p.price,
        salePrice: p.salePrice,
        href: student ? `/dashboard/products/${p.id}` : `/login?next=${encodeURIComponent(`/dashboard/products/${p.id}`)}`,
      })),
    ...courses
      .filter((c) => (courseLevels ? courseLevels.get(c.id) !== "none" : !c.hiddenFromGuest))
      .map((c) => ({
        id: c.id,
        kind: "COURSE" as const,
        title: c.title,
        coverImageUrl: c.coverImageUrl,
        price: c.price,
        salePrice: c.salePrice,
        href: student ? `/dashboard/courses/${c.id}` : `/login?next=${encodeURIComponent(`/dashboard/courses/${c.id}`)}`,
      })),
    ...libraryItems
      .filter((l) => (libraryLevels ? libraryLevels.get(l.id) !== "none" : l.visibleToStudents))
      .map((l) => ({
        id: l.id,
        kind: "LIBRARY_ITEM" as const,
        title: l.title,
        coverImageUrl: l.coverImageUrl,
        price: l.price,
        salePrice: l.salePrice,
        href: student ? `/dashboard/library/${l.id}` : `/login?next=${encodeURIComponent(`/dashboard/library/${l.id}`)}`,
      })),
  ];

  const joinedAt = vendor.reviewedAt ?? vendor.appliedAt;
  const kindIcon = { PRODUCT: Package, COURSE: GraduationCap, LIBRARY_ITEM: BookOpen } as const;
  const kindLabel = { PRODUCT: "Sản phẩm", COURSE: "Khoá học", LIBRARY_ITEM: "Sách" } as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <BrandLogo />
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Về trang chủ
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-8 sm:flex-row sm:items-center sm:px-8">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-xl font-bold text-primary-foreground">
          {vendor.logoUrl ? (
            <Image src={vendor.logoUrl} alt={vendor.shopName} fill sizes="64px" className="object-cover" />
          ) : (
            vendor.shopName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{vendor.shopName}</h1>
          {vendor.bio && <p className="mt-1 max-w-xl text-sm text-muted">{vendor.bio}</p>}
          <p className="mt-1 text-xs text-faint">
            Tham gia từ {String(joinedAt.getMonth() + 1).padStart(2, "0")}/{joinedAt.getFullYear()} · {cards.length} mặt hàng đang bán
          </p>
        </div>
        <a
          href={`mailto:${vendor.contactEmail}`}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Mail className="h-4 w-4" />
          Liên hệ gian hàng
        </a>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
        <h2 className="mb-4 text-base font-semibold text-foreground">Tất cả sản phẩm của {vendor.shopName}</h2>
        {cards.length === 0 ? (
          <p className="text-sm text-muted">Gian hàng chưa có sản phẩm nào đang bán.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const pricing = getPricing(card);
              const Icon = kindIcon[card.kind];
              return (
                <Link
                  key={`${card.kind}:${card.id}`}
                  href={card.href}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/60"
                >
                  <div className="relative flex aspect-video w-full items-center justify-center bg-surface-hover">
                    {card.coverImageUrl ? (
                      <Image src={card.coverImageUrl} alt={card.title} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                    ) : (
                      <Icon className="h-8 w-8 text-muted" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <Badge color="muted">{kindLabel[card.kind]}</Badge>
                    <p className="font-medium text-foreground">{card.title}</p>
                    <p className="mt-auto text-sm font-semibold tabular-nums text-primary">
                      {pricing.forSale ? formatVND(pricing.chargeAmount) : "Liên hệ"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
