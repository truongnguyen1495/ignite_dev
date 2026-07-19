import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserPlus,
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
  UserCog,
  Receipt,
  Package,
} from "lucide-react";
import { requireAnyAdminAccess, isChatEnabled, isSalesEnabled } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { getAdminGuestChatInbox } from "@/lib/guest-chat";
import { getDictionary } from "@/lib/i18n/get-locale";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { AdminPermissionKind } from "@prisma/client";

const iconClass = "h-4 w-4";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: admin, isSuperAdmin, isAdminManager, canManageAdmins, permissions } = await requireAnyAdminAccess();
  const canManage = (permission: AdminPermissionKind) => isSuperAdmin || isAdminManager || permissions.has(permission);
  const { t } = await getDictionary();

  // Live unread count needs a DB read, so NAV_ITEMS moves inside the async
  // body (unlike a purely static nav) — same reasoning as the "Nhắn tin"
  // badge in dashboard/layout.tsx.
  const chatEnabled = await isChatEnabled();
  const canManageChat = chatEnabled && canManage("MANAGE_CHAT");
  const salesEnabled = await isSalesEnabled();
  const canManageOrders = salesEnabled && canManage("MANAGE_ORDERS");
  const [supportThreads, guestThreads] = canManageChat
    ? await Promise.all([getAdminSupportInbox(admin.id), getAdminGuestChatInbox(admin.id)])
    : [[], []];
  const unreadSupportCount =
    supportThreads.reduce((sum, t) => sum + t.unreadCount, 0) +
    guestThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  // Every item not gated by a permission (Tổng quan) is visible to any admin,
  // full or limited — the rest only show up if requireAnyAdminAccess granted
  // that specific slice (or the caller is a full Super Admin).
  const ALL_NAV_ITEMS: { item: NavItem; permission?: AdminPermissionKind }[] = [
    { item: { href: "/admin", label: t.adminNav.overview, icon: <LayoutDashboard className={iconClass} />, exact: true } },
    {
      item: {
        href: "/admin/prospective-students",
        label: t.adminNav.prospectiveStudents,
        icon: <UserPlus className={iconClass} />,
        // Claims the shared /admin/students/[studentId] detail route when
        // linked to with ?from=prospective (see the "Học sinh" list page's
        // "Xem chi tiết" link) — see NavItem's comment in sidebar.tsx.
        altActiveHrefPrefix: "/admin/students",
        altActiveQuery: { param: "from", value: "prospective" },
      },
      permission: "MANAGE_PROSPECTIVE_STUDENTS",
    },
    {
      item: { href: "/admin/courses", label: t.adminNav.exclusiveCourses, icon: <Crown className={iconClass} /> },
      permission: "MANAGE_COURSES",
    },
    {
      item: { href: "/admin/library", label: t.adminNav.library, icon: <Library className={iconClass} /> },
      permission: "MANAGE_LIBRARY",
    },
    {
      item: { href: "/admin/products", label: t.adminNav.products, icon: <Package className={iconClass} /> },
      permission: "MANAGE_PRODUCTS",
    },
    {
      item: { href: "/admin/orders", label: t.adminNav.orders, icon: <Receipt className={iconClass} /> },
      permission: "MANAGE_ORDERS",
    },
    {
      item: { href: "/admin/announcements", label: t.adminNav.announcements, icon: <Megaphone className={iconClass} /> },
      permission: "MANAGE_ANNOUNCEMENTS",
    },
    {
      item: {
        href: "/admin/chat",
        label: t.adminNav.support,
        icon: <MessageCircle className={iconClass} />,
        badge: unreadSupportCount,
      },
      permission: "MANAGE_CHAT",
    },
  ];

  const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter(({ permission }) => {
    if (!permission) return true;
    if (permission === "MANAGE_CHAT") return canManageChat;
    if (permission === "MANAGE_ORDERS") return canManageOrders;
    return canManage(permission);
  }).map(({ item }) => item);

  // "Bài học" / "Kết quả" / "Yêu cầu lên cấp" nest under "Học viên" so the
  // sidebar reads shorter, per user request — collapsed by default, the
  // Sidebar component auto-expands it while the active route is inside one
  // of them. A limited admin who can manage one of these but lacks
  // MANAGE_STUDENTS itself (so has no "Học viên" row to nest under) falls
  // back to flat top-level entries instead of losing access to the page.
  const studentChildren: NavItem[] = [
    ...(canManage("MANAGE_LESSONS_QUIZZES")
      ? [{ href: "/admin/lessons", label: t.adminNav.lessons, icon: <BookOpen className={iconClass} /> }]
      : []),
    ...(canManage("MANAGE_RESULTS")
      ? [{ href: "/admin/results", label: t.adminNav.results, icon: <ClipboardList className={iconClass} /> }]
      : []),
    ...(canManage("MANAGE_LEVEL_UP_REQUESTS")
      ? [
          {
            href: "/admin/level-up-requests",
            label: t.adminNav.levelUpRequests,
            icon: <ArrowUpCircle className={iconClass} />,
          },
        ]
      : []),
  ];

  if (canManage("MANAGE_STUDENTS")) {
    NAV_ITEMS.splice(1, 0, {
      href: "/admin/students",
      label: t.adminNav.students,
      icon: <Users className={iconClass} />,
      children: studentChildren.length > 0 ? studentChildren : undefined,
      // See the "Học sinh" item's altActiveQuery above — don't also claim
      // the shared detail route when it's actually a "học sinh" record.
      suppressActiveQuery: { param: "from", value: "prospective" },
    });
  } else {
    NAV_ITEMS.splice(1, 0, ...studentChildren);
  }

  // Admin management needs its own explicit canManageAdmins grant even for
  // an Admin Manager (see requireAdminManagementAccess in src/lib/access.ts)
  // — isAdminManager alone isn't enough. Settings (feature toggles) stays
  // Super-Admin only no matter what, so an Admin Manager never sees it.
  if (isSuperAdmin || (isAdminManager && canManageAdmins)) {
    NAV_ITEMS.push({ href: "/admin/admins", label: t.adminNav.adminManagement, icon: <UserCog className={iconClass} /> });
  }
  if (isSuperAdmin) {
    NAV_ITEMS.push({ href: "/admin/settings", label: t.adminNav.settings, icon: <Settings className={iconClass} /> });
  }

  return (
    <SidebarProvider>
      <Sidebar
        items={NAV_ITEMS}
        variant="navy"
        brand={<BrandLogo subtitle={t.brandSubtitle.admin} variant="navy" />}
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
                {t.adminNav.backToStudentPage}
              </Link>
            )}
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{admin.name}</span>
              <span className="hidden shrink-0 text-foreground sm:inline">
                ({isSuperAdmin ? t.common.superAdmin : isAdminManager ? t.common.adminManager : t.common.admin})
              </span>
            </span>
            <LanguageSwitcher />
            <LogoutButton label={t.common.logout} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
