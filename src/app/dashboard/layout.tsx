import Link from "next/link";
import {
  LayoutDashboard,
  ArrowUpCircle,
  Video,
  UserCircle,
  Megaphone,
  Library,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Package,
  Presentation,
} from "lucide-react";
import { requireActiveStudent, isChatEnabled, isSalesEnabled, isWhiteboardsEnabled, getAdminPermissions } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentChatInbox } from "@/lib/chat";
import { LEVEL_LABELS } from "@/lib/levels";
import { announcementVisibleTo } from "@/lib/announcements";
import { getDictionary } from "@/lib/i18n/get-locale";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/ui/admin-header";
import { MainContent } from "@/components/ui/main-content";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstallAppButton } from "@/components/install-app-button";
import { LevelBadge } from "@/components/ui/level-badge";
import { LevelUpWatcher } from "./level-up-watcher";

const iconClass = "h-4 w-4";

// The whiteboards LIST page (/dashboard/whiteboards, no boardId) keeps the
// normal padded card-grid/nav look; only the editor route opts out of the
// padded/max-width wrapper — same convention as admin/layout.tsx's own
// full-bleed pattern (see MainContent's comment in src/components/ui/main-content.tsx).
const DASHBOARD_FULL_BLEED_PATTERN = "^/dashboard/whiteboards/[^/]+$";

// Same reasoning as admin/layout.tsx: reads live, per-student data (chat,
// cart, admin permissions) on every render — must never be statically
// prerendered at build time, where there's no reachable database.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();
  const { t } = await getDictionary();

  const [announcements, reads, chatEnabled, salesEnabled, whiteboardsEnabled, adminPermissions, cartCount] =
    await Promise.all([
      prisma.announcement.findMany({
        select: { id: true, minLevel: true, visibleToStudents: true, visibleToLeveled: true },
      }),
      prisma.announcementRead.findMany({
        where: { studentId: student.id },
        select: { announcementId: true },
      }),
      isChatEnabled(),
      isSalesEnabled(),
      isWhiteboardsEnabled(),
      getAdminPermissions(student.id),
      prisma.cartItem.count({ where: { studentId: student.id } }),
    ]);
  // An Admin Manager's full content access bypasses the AdminPermission
  // table entirely (see hasFullAdminAccess in src/lib/access.ts), so its size
  // alone would miss them here.
  const hasAdminAccess = adminPermissions.size > 0 || student.isAdminManager;
  const chatInbox = chatEnabled ? await getStudentChatInbox(student) : null;
  const readIds = new Set(reads.map((r) => r.announcementId));
  const unreadAnnouncementCount = announcements.filter(
    (a) => a.visibleToStudents && announcementVisibleTo(a, student.grantedLevel) && !readIds.has(a.id)
  ).length;
  const unreadChatCount = chatInbox
    ? chatInbox.support.unreadCount +
      chatInbox.directThreads.reduce((sum, t) => sum + t.unreadCount, 0) +
      chatInbox.groupRooms.reduce((sum, r) => sum + r.unreadCount, 0)
    : 0;

  const NAV_ITEMS: NavItem[] = [
    { href: "/dashboard", label: t.dashboardNav.fiveLevelTraining, icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/dashboard/courses", label: t.dashboardNav.exclusiveCourses, icon: <Video className={iconClass} /> },
    { href: "/dashboard/library", label: t.dashboardNav.library, icon: <Library className={iconClass} /> },
    { href: "/dashboard/products", label: t.dashboardNav.products, icon: <Package className={iconClass} /> },
    {
      href: "/dashboard/announcements",
      label: t.dashboardNav.announcements,
      icon: <Megaphone className={iconClass} />,
      badge: unreadAnnouncementCount,
    },
    ...(chatEnabled
      ? [
          {
            href: "/dashboard/chat",
            label: t.dashboardNav.chat,
            icon: <MessageCircle className={iconClass} />,
            badge: unreadChatCount,
          },
        ]
      : []),
    ...(whiteboardsEnabled
      ? [{ href: "/dashboard/whiteboards", label: t.dashboardNav.whiteboards, icon: <Presentation className={iconClass} /> }]
      : []),
    { href: "/dashboard/level-up", label: t.dashboardNav.levelUp, icon: <ArrowUpCircle className={iconClass} /> },
    { href: "/dashboard/profile", label: t.dashboardNav.profile, icon: <UserCircle className={iconClass} /> },
  ];

  return (
    <SidebarProvider>
      <LevelUpWatcher
        studentId={student.id}
        level={student.grantedLevel}
        label={LEVEL_LABELS[student.grantedLevel]}
      />
      <Sidebar items={NAV_ITEMS} brand={<BrandLogo subtitle={t.brandSubtitle.hocVien} />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          fullBleedPattern={DASHBOARD_FULL_BLEED_PATTERN}
          left={<SidebarToggle />}
          right={
            <>
              {hasAdminAccess && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t.dashboardNav.goToAdmin}
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-bg text-xs font-semibold text-primary">
                  {student.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground">{student.name}</span>
                  <span className="flex items-center gap-1.5">
                    {student.username && (
                      <span className="truncate text-[11px] text-muted">@{student.username}</span>
                    )}
                    <LevelBadge level={student.grantedLevel} />
                  </span>
                </span>
              </span>
              {salesEnabled && (
                <Link
                  href="/dashboard/cart"
                  title="Giỏ hàng"
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-dark-strong">
                      {cartCount}
                    </span>
                  )}
                  <span className="sr-only">Giỏ hàng</span>
                </Link>
              )}
              <InstallAppButton />
              <LanguageSwitcher />
              <LogoutButton label={t.common.logout} />
            </>
          }
        />
        <MainContent fullBleedPattern={DASHBOARD_FULL_BLEED_PATTERN}>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
