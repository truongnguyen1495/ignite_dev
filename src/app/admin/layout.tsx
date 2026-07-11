import Link from "next/link";
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
  GraduationCap,
} from "lucide-react";
import { requireAnyAdminAccess, isChatEnabled } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import type { AdminPermissionKind } from "@prisma/client";

const iconClass = "h-4 w-4";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: admin, isSuperAdmin, permissions } = await requireAnyAdminAccess();
  const canManage = (permission: AdminPermissionKind) => isSuperAdmin || permissions.has(permission);

  // Live unread count needs a DB read, so NAV_ITEMS moves inside the async
  // body (unlike a purely static nav) — same reasoning as the "Nhắn tin"
  // badge in dashboard/layout.tsx.
  const chatEnabled = await isChatEnabled();
  const canManageChat = chatEnabled && canManage("MANAGE_CHAT");
  const supportThreads = canManageChat ? await getAdminSupportInbox(admin.id) : [];
  const unreadSupportCount = supportThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  // Every item not gated by a permission (Tổng quan) is visible to any admin,
  // full or limited — the rest only show up if requireAnyAdminAccess granted
  // that specific slice (or the caller is a full Super Admin).
  const ALL_NAV_ITEMS: { item: NavItem; permission?: AdminPermissionKind }[] = [
    { item: { href: "/admin", label: "Tổng quan", icon: <LayoutDashboard className={iconClass} />, exact: true } },
    {
      item: { href: "/admin/students", label: "Học viên", icon: <Users className={iconClass} /> },
      permission: "MANAGE_STUDENTS",
    },
    {
      item: { href: "/admin/lessons", label: "Bài học", icon: <BookOpen className={iconClass} /> },
      permission: "MANAGE_LESSONS_QUIZZES",
    },
    {
      item: { href: "/admin/courses", label: "Khóa học độc quyền", icon: <Crown className={iconClass} /> },
      permission: "MANAGE_COURSES",
    },
    {
      item: { href: "/admin/library", label: "Thư viện", icon: <Library className={iconClass} /> },
      permission: "MANAGE_LIBRARY",
    },
    {
      item: { href: "/admin/announcements", label: "Bản tin", icon: <Megaphone className={iconClass} /> },
      permission: "MANAGE_ANNOUNCEMENTS",
    },
    {
      item: {
        href: "/admin/chat",
        label: "Hỗ trợ học viên",
        icon: <MessageCircle className={iconClass} />,
        badge: unreadSupportCount,
      },
      permission: "MANAGE_CHAT",
    },
    {
      item: { href: "/admin/results", label: "Kết quả", icon: <ClipboardList className={iconClass} /> },
      permission: "MANAGE_RESULTS",
    },
    {
      item: {
        href: "/admin/level-up-requests",
        label: "Yêu cầu lên cấp",
        icon: <ArrowUpCircle className={iconClass} />,
      },
      permission: "MANAGE_LEVEL_UP_REQUESTS",
    },
  ];

  const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter(
    ({ permission }) => !permission || (permission === "MANAGE_CHAT" ? canManageChat : canManage(permission))
  ).map(({ item }) => item);

  // Settings (and the admin-permission grants it holds) stays Super-Admin
  // only — a limited admin must never see, let alone reach, the page that
  // could grant itself more permissions.
  if (isSuperAdmin) {
    NAV_ITEMS.push({ href: "/admin/settings", label: "Cài đặt", icon: <Settings className={iconClass} /> });
  }

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
            {!isSuperAdmin && !admin.adminOnly && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Về trang học viên
              </Link>
            )}
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{admin.name}</span>
              <span className="hidden shrink-0 text-foreground sm:inline">
                ({isSuperAdmin ? "Super Admin" : "Admin"})
              </span>
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
