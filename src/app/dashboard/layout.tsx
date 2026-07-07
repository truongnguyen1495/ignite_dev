import { LayoutDashboard, ArrowUpCircle, GraduationCap } from "lucide-react";
import { requireActiveStudent } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { Sidebar, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

const iconClass = "h-4 w-4";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "5 Cấp đào tạo", icon: <LayoutDashboard className={iconClass} />, exact: true },
  { href: "/dashboard/level-up", label: "Xin lên cấp", icon: <ArrowUpCircle className={iconClass} /> },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();

  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle="Học viên" />} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-border px-8 py-4">
          <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            {student.name} <span className="text-foreground">({LEVEL_LABELS[student.grantedLevel]})</span>
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
