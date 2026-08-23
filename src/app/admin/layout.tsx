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
  UserCog,
  Receipt,
  Package,
  Phone,
  Presentation,
  UsersRound,
  Brain,
  Gift,
  Banknote,
  Share2,
  TrendingUp,
  Wallet,
  Store,
} from "lucide-react";
import { requireAnyAdminAccess, isChatEnabled, isSalesEnabled, isWhiteboardsEnabled } from "@/lib/access";
import { getAdminSupportInbox } from "@/lib/chat";
import { getAdminGuestChatInbox } from "@/lib/guest-chat";
import { getDictionary } from "@/lib/i18n/get-locale";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/ui/admin-header";
import { MainContent } from "@/components/ui/main-content";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstallAppButton } from "@/components/install-app-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AdminPermissionKind } from "@prisma/client";

const iconClass = "h-4 w-4";

// The whiteboards LIST page (/admin/whiteboards, no boardId) deliberately
// keeps the normal padded card-grid look; only the editor route opts out of
// the padded/max-width wrapper (see MainContent's own comment for why).
const ADMIN_FULL_BLEED_PATTERN = "^/admin/whiteboards/[^/]+$";

// Every admin page reads live, per-admin data (permissions, unread chat
// counts, toggleable settings) through this layout — it must never be
// statically prerendered at build time, where there's no real request and
// no reachable database connection (see the P1001 build failures this was
// causing on whichever /admin/** page Next picked first to prerender).
// Same reasoning as the guest pages' "force-dynamic" comments.
export const dynamic = "force-dynamic";

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
  // Revenue is entirely a read of Order/Refund data — meaningless with sales
  // switched off, same reasoning as canManageOrders above.
  const canManageFinance = salesEnabled && canManage("MANAGE_FINANCE");
  const whiteboardsEnabled = await isWhiteboardsEnabled();
  const [supportThreads, guestThreads] = canManageChat
    ? await Promise.all([getAdminSupportInbox(admin.id), getAdminGuestChatInbox(admin.id)])
    : [[], []];
  const unreadSupportCount =
    supportThreads.reduce((sum, t) => sum + t.unreadCount, 0) +
    guestThreads.reduce((sum, t) => sum + t.unreadCount, 0);

  // Visibility rule for every permission-gated row. MANAGE_CHAT,
  // MANAGE_ORDERS and MANAGE_FINANCE also depend on their own feature master
  // switch, which is why they resolve through their booleans instead of
  // canManage().
  const isVisible = (permission?: AdminPermissionKind) => {
    if (!permission) return true;
    if (permission === "MANAGE_CHAT") return canManageChat;
    if (permission === "MANAGE_ORDERS") return canManageOrders;
    if (permission === "MANAGE_FINANCE") return canManageFinance;
    return canManage(permission);
  };
  const visible = (entries: { item: NavItem; permission?: AdminPermissionKind }[]): NavItem[] =>
    entries.filter(({ permission }) => isVisible(permission)).map(({ item }) => item);

  // Content an admin authors. Whiteboards has no permission of its own (this
  // app has no MANAGE_WHITEBOARDS) — only the master switch gates it.
  const contentChildren = visible([
    {
      item: { href: "/admin/courses", label: t.adminNav.exclusiveCourses, icon: <Crown className={iconClass} /> },
      permission: "MANAGE_COURSES",
    },
    {
      item: { href: "/admin/library", label: t.adminNav.library, icon: <Library className={iconClass} /> },
      permission: "MANAGE_LIBRARY",
    },
    {
      item: { href: "/admin/announcements", label: t.adminNav.announcements, icon: <Megaphone className={iconClass} /> },
      permission: "MANAGE_ANNOUNCEMENTS",
    },
    ...(whiteboardsEnabled
      ? [{ item: { href: "/admin/whiteboards", label: t.adminNav.whiteboards, icon: <Presentation className={iconClass} /> } }]
      : []),
  ]);

  // Everything touching money or the sales funnel, previously scattered
  // through the flat list. Affiliate has no feature behind it yet so it
  // still borrows MANAGE_ORDERS, the closest existing grant, until it gets
  // MANAGE_AFFILIATE of its own. Finance (the thu-chi ledger) now shares
  // MANAGE_FINANCE with the read-only revenue report below — see the
  // permission-scope note on ADMIN_PERMISSION_LABELS.MANAGE_FINANCE.
  const businessChildren = visible([
    {
      item: { href: "/admin/orders", label: t.adminNav.orders, icon: <Receipt className={iconClass} /> },
      permission: "MANAGE_ORDERS",
    },
    {
      item: { href: "/admin/products", label: t.adminNav.products, icon: <Package className={iconClass} /> },
      permission: "MANAGE_PRODUCTS",
    },
    {
      item: { href: "/admin/consultations", label: t.adminNav.consultations, icon: <Phone className={iconClass} /> },
      permission: "MANAGE_PRODUCTS",
    },
    {
      item: { href: "/admin/vendors", label: t.adminNav.vendors, icon: <Store className={iconClass} /> },
      permission: "MANAGE_VENDORS",
    },
    {
      item: {
        href: "/admin/affiliate",
        label: t.adminNav.affiliate,
        icon: <Share2 className={iconClass} />,
        comingSoon: true,
      },
      permission: "MANAGE_ORDERS",
    },
    {
      item: { href: "/admin/revenue", label: t.adminNav.revenue, icon: <TrendingUp className={iconClass} /> },
      permission: "MANAGE_FINANCE",
    },
    {
      item: { href: "/admin/finance", label: t.adminNav.finance, icon: <Wallet className={iconClass} /> },
      permission: "MANAGE_FINANCE",
    },
  ]);

  // "Bài học" / "Kết quả" / "Yêu cầu lên cấp" nest under "Thành viên" so the
  // sidebar reads shorter, per user request — collapsed by default, the
  // Sidebar component auto-expands it while the active route is inside one
  // of them. A limited admin who can manage one of these but lacks
  // MANAGE_STUDENTS itself (so has no "Thành viên" row to nest under) falls
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

  // "Nhóm của tôi" admin surfaces — "Khám phá bản thân" (nhập kết quả trắc
  // nghiệm) and "Mini-game & thưởng" nest under "Danh sách nhóm" the same
  // way lessons/results/level-up nest under "Thành viên" above, including the
  // same flat-fallback for a limited admin who holds MANAGE_TESTS/
  // MANAGE_MINIGAME but not MANAGE_GROUPS itself. Deliberately does NOT
  // include "Soạn nhiệm vụ mới"/"Giải trình chờ duyệt" — those are reached
  // per-group from inside /admin/groups/[groupId] (admin) or
  // /dashboard/my-group (the group's own LEADER/DEPUTY, gated by
  // requireOwnGroupLeadership, not an AdminPermission — see src/lib/access.ts).
  const groupChildren: NavItem[] = [
    ...(canManage("MANAGE_TESTS")
      ? [{ href: "/admin/tests", label: t.adminNav.tests, icon: <Brain className={iconClass} /> }]
      : []),
    ...(canManage("MANAGE_MINIGAME")
      ? [{ href: "/admin/minigame", label: t.adminNav.minigame, icon: <Gift className={iconClass} /> }]
      : []),
  ];

  // Built in display order rather than assembled with splice() at computed
  // indices, which is how this read before: every row added or removed shifted
  // the offsets the later inserts depended on. A grouping row is dropped
  // entirely when the admin can see none of its children, so a limited admin
  // never gets an empty header that expands into nothing.
  //
  // Admin management needs its own explicit canManageAdmins grant even for an
  // Admin Manager (see requireAdminManagementAccess in src/lib/access.ts) —
  // isAdminManager alone isn't enough. Settings (feature toggles) stays
  // Super-Admin only no matter what, so an Admin Manager never sees it.
  const NAV_ITEMS: NavItem[] = [
    { href: "/admin", label: t.adminNav.overview, icon: <LayoutDashboard className={iconClass} />, exact: true },
    ...(contentChildren.length > 0
      ? [{ label: t.adminNav.content, icon: <BookOpen className={iconClass} />, children: contentChildren }]
      : []),
    ...(businessChildren.length > 0
      ? [{ label: t.adminNav.business, icon: <Banknote className={iconClass} />, children: businessChildren }]
      : []),
    ...(canManageChat
      ? [
          {
            href: "/admin/chat",
            label: t.adminNav.support,
            icon: <MessageCircle className={iconClass} />,
            badge: unreadSupportCount,
          },
        ]
      : []),
    ...(canManage("MANAGE_STUDENTS")
      ? [
          {
            href: "/admin/students",
            label: t.adminNav.students,
            icon: <Users className={iconClass} />,
            children: studentChildren.length > 0 ? studentChildren : undefined,
          },
        ]
      : studentChildren),
    ...(canManage("MANAGE_GROUPS")
      ? [
          {
            href: "/admin/groups",
            label: t.adminNav.groups,
            icon: <UsersRound className={iconClass} />,
            children: groupChildren.length > 0 ? groupChildren : undefined,
          },
        ]
      : groupChildren),
    ...(isSuperAdmin || (isAdminManager && canManageAdmins)
      ? [{ href: "/admin/admins", label: t.adminNav.adminManagement, icon: <UserCog className={iconClass} /> }]
      : []),
    ...(isSuperAdmin
      ? [{ href: "/admin/settings", label: t.adminNav.settings, icon: <Settings className={iconClass} /> }]
      : []),
  ];

  return (
    <SidebarProvider>
      <Sidebar
        items={NAV_ITEMS}
        variant="navy"
        brand={<BrandLogo subtitle={t.brandSubtitle.admin} variant="navy" />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          fullBleedPattern={ADMIN_FULL_BLEED_PATTERN}
          left={<SidebarToggle />}
          right={
            <>
              {!isSuperAdmin && !admin.adminOnly && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  {t.adminNav.backToStudentPage}
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-xs text-muted">
                <UserAvatar src={admin.avatarUrl} name={admin.name} size={24} className="text-[10px]" />
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{admin.name}</span>
                <span className="hidden shrink-0 text-foreground sm:inline">
                  ({isSuperAdmin ? t.common.superAdmin : isAdminManager ? t.common.adminManager : t.common.admin})
                </span>
              </span>
              <InstallAppButton />
              <LanguageSwitcher />
              <LogoutButton label={t.common.logout} />
            </>
          }
        />
        <MainContent fullBleedPattern={ADMIN_FULL_BLEED_PATTERN}>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
