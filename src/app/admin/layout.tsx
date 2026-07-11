import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  ArrowUpCircle,
  Settings,
  ShieldCheck,
  Crown,
  Megaphone,
  Library,
  MessageCircle,
} from "lucide-react";
import { requireActiveSuperAdmin, isChatEnabled } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";

const iconClass = "h-4 w-4";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireActiveSuperAdmin();

  // Live unread count needs a DB read, so NAV_ITEMS moves inside the async
  // body (unlike a purely static nav) — same reasoning as the "Nhắn tin"
  // badge in dashboard/layout.tsx.
  const chatEnabled = await isChatEnabled();
  const supportThreads = chatEnabled ? await getAdminSupportInbox(admin.id) : [];
  const unreadSupportCount = supportThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  const NAV_ITEMS: NavItem[] = [
    { href: "/admin", label: "Tổng quan", icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/admin/students", label: "Học viên", icon: <Users className={iconClass} /> },
    { href: "/admin/lessons", label: "Bài học", icon: <BookOpen className={iconClass} /> },
    { href: "/admin/courses", label: "Khóa học độc quyền", icon: <Crown className={iconClass} /> },
    { href: "/admin/library", label: "Thư viện", icon: <Library className={iconClass} /> },
    { href: "/admin/announcements", label: "Bản tin", icon: <Megaphone className={iconClass} /> },
    ...(chatEnabled
      ? [
          {
            href: "/admin/chat",
            label: "Hỗ trợ học viên",
            icon: <MessageCircle className={iconClass} />,
            badge: unreadSupportCount,
          },
        ]
      : []),
    { href: "/admin/results", label: "Kết quả", icon: <ClipboardList className={iconClass} /> },
    { href: "/admin/level-up-requests", label: "Yêu cầu lên cấp", icon: <ArrowUpCircle className={iconClass} /> },
    { href: "/admin/settings", label: "Cài đặt", icon: <Settings className={iconClass} /> },
  ];

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
