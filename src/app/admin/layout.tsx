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
import { Sidebar, type NavItem } from "@/components/ui/sidebar";
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
    <div className="flex min-h-screen">
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle="Quản trị viên" />} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-border px-8 py-4">
          <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {admin.name} <span className="text-foreground">(Super Admin)</span>
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
