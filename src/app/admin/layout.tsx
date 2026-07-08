import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  ArrowUpCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { requireActiveSuperAdmin } from "@/lib/access";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

const iconClass = "h-4 w-4";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: <LayoutDashboard className={iconClass} />, exact: true },
  { href: "/admin/students", label: "Học viên", icon: <Users className={iconClass} /> },
  { href: "/admin/lessons", label: "Bài học", icon: <BookOpen className={iconClass} /> },
  { href: "/admin/results", label: "Kết quả", icon: <ClipboardList className={iconClass} /> },
  { href: "/admin/level-up-requests", label: "Yêu cầu lên cấp", icon: <ArrowUpCircle className={iconClass} /> },
  { href: "/admin/settings", label: "Cài đặt", icon: <Settings className={iconClass} /> },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireActiveSuperAdmin();

  return (
    <SidebarProvider>
      <Sidebar
        items={NAV_ITEMS}
        variant="navy"
        brand={<BrandLogo subtitle="Quản trị viên" variant="navy" />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
          <SidebarToggle />
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{admin.name}</span>
              <span className="hidden shrink-0 text-foreground sm:inline">(Super Admin)</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
