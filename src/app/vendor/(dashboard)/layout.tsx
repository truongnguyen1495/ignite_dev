import Link from "next/link";
import { LayoutDashboard, Package, Receipt, Wallet, TrendingUp, Store, GraduationCap } from "lucide-react";
import { requireVendorAccountAccess } from "@/lib/access";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/ui/admin-header";
import { MainContent } from "@/components/ui/main-content";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/ui/user-avatar";

const iconClass = "h-4 w-4";

const NAV_ITEMS: NavItem[] = [
  { href: "/vendor", label: "Tổng quan", icon: <LayoutDashboard className={iconClass} />, exact: true },
  { href: "/vendor/san-pham", label: "Sản phẩm của tôi", icon: <Package className={iconClass} /> },
  { href: "/vendor/don-hang", label: "Đơn hàng", icon: <Receipt className={iconClass} /> },
  { href: "/vendor/hoa-hong", label: "Hoa hồng & Rút tiền", icon: <Wallet className={iconClass} /> },
  { href: "/vendor/doanh-thu", label: "Doanh thu", icon: <TrendingUp className={iconClass} /> },
  { href: "/vendor/ho-so", label: "Hồ sơ gian hàng", icon: <Store className={iconClass} /> },
];

// Reads live per-vendor data (application/pause status) on every render —
// must never be statically prerendered, same "force-dynamic" reasoning as
// admin/layout.tsx and dashboard/layout.tsx.
export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, vendor } = await requireVendorAccountAccess();

  return (
    <SidebarProvider>
      <Sidebar items={NAV_ITEMS} variant="navy" brand={<BrandLogo subtitle="Nhà bán hàng" variant="navy" />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          fullBleedPattern="^$"
          left={<SidebarToggle />}
          right={
            <>
              {/* A vendorOnly account has no student space at all (see
                  requireActiveStudent's own comment) — the return pill would
                  just bounce it right back here, so it's dropped entirely
                  rather than shown disabled. */}
              {!user.vendorOnly && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  Chuyển về không gian học viên
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-xs text-muted">
                <UserAvatar src={user.avatarUrl} name={user.name} size={24} className="text-[10px]" />
                <span className="truncate text-foreground">{vendor.shopName}</span>
              </span>
              <LogoutButton />
            </>
          }
        />
        <MainContent fullBleedPattern="^$">{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
