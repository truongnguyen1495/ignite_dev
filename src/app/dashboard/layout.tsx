import Link from "next/link";
import {
  ArrowUpCircle,
  Award,
  BookOpen,
  Briefcase,
  Clock,
  Contact,
  FileText,
  Globe,
  LayoutDashboard,
  Library,
  ListChecks,
  Megaphone,
  MessageCircle,
  Package,
  Presentation,
  Receipt,
  Route,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  UserCircle,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import {
  requireActiveStudent,
  isChatEnabled,
  isSalesEnabled,
  isWhiteboardsEnabled,
  getAdminPermissions,
  getVendorForUser,
} from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getStudentChatInbox } from "@/lib/chat";
import { LEVEL_LABELS } from "@/lib/levels";
import { announcementVisibleTo } from "@/lib/announcements";
import { getDictionary } from "@/lib/i18n/get-locale";
import { Sidebar, SidebarProvider, SidebarToggle, type NavItem, type NavEntry } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/ui/admin-header";
import { MainContent } from "@/components/ui/main-content";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstallAppButton } from "@/components/install-app-button";
import { LevelBadge } from "@/components/ui/level-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
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

  const [announcements, reads, chatEnabled, salesEnabled, whiteboardsEnabled, adminPermissions, cartCount, vendor] =
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
      getVendorForUser(student.id),
    ]);
  // Mirrors the admin-access pill below it: only an APPROVED vendor gets the
  // shortcut — PENDING/REJECTED has nowhere useful to land from here (that's
  // /vendor/trang-thai's job, reached by actually opening /vendor).
  const isApprovedVendor = vendor?.applicationStatus === "APPROVED";
  // Sidebar counterpart of the header pill above — a student who is ALREADY
  // an approved vendor uses that pill instead, so this row would just be a
  // second path to the same place. No Vendor row at all -> the registration
  // page; a PENDING/REJECTED one -> its own status page, so the row always
  // leads somewhere useful rather than back through the same form twice.
  const vendorNavItems: NavEntry[] = isApprovedVendor
    ? []
    : [
        {
          href: vendor ? "/vendor/trang-thai" : "/vendor/dang-ky",
          label: t.dashboardNav.vendorRegister,
          icon: <Store className={iconClass} />,
        },
      ];
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

  // Three named runs of things that WORK, then everything unbuilt in one
  // group at the bottom.
  //
  // The old shape had eight groups and eleven of its twenty destinations
  // pointing at a "sắp ra mắt" page, scattered across five of those groups —
  // so opening almost any group turned up dead ends, and the very first row
  // in the rail ("Dashboard") was one of them. The "sắp ra mắt" promise is
  // kept, per the original decision; it just stops outnumbering the product.
  //
  // Each unbuilt entry still sits at its FINAL url, so shipping one means
  // moving its row up into a real run — no link changes, no broken bookmark.
  const comingSoonChildren: NavItem[] = [
    // "Dashboard" used to lead this list; it shipped, and it took /dashboard
    // itself — see the first two rows of NAV_ITEMS below.
    { href: "/dashboard/leads", label: t.dashboardNav.leadManagement, icon: <UserPlus className={iconClass} /> },
    { href: "/dashboard/checklist", label: t.dashboardNav.checklist, icon: <ListChecks className={iconClass} /> },
    { href: "/dashboard/business-tools", label: t.dashboardNav.businessTools, icon: <Briefcase className={iconClass} /> },
    { href: "/dashboard/certificates", label: t.dashboardNav.certificates, icon: <Award className={iconClass} /> },
    { href: "/dashboard/community", label: t.dashboardNav.community, icon: <Globe className={iconClass} /> },
    { href: "/dashboard/members", label: t.dashboardNav.members, icon: <Contact className={iconClass} /> },
    { href: "/dashboard/affiliate", label: t.dashboardNav.affiliate, icon: <Share2 className={iconClass} /> },
    // Two routes, one row: "Lead" (team-leads) duplicated "Quản lý Lead"
    // above, and Doanh thu/Thu chi are one idea split in two. Both pairs
    // separate again once they are real.
    { href: "/dashboard/revenue", label: t.dashboardNav.revenueAndFinance, icon: <TrendingUp className={iconClass} /> },
  ];

  const NAV_ITEMS: NavEntry[] = [
    { section: t.dashboardNav.sectionLearning },
    // The overview is what /dashboard answers to now, so it takes the first
    // row — it is where signing in lands, and where the sidebar's "home" has
    // to point. The six-level ladder keeps the row directly under it and is
    // still the spine of the product; it just moved to its own url rather
    // than doubling as the landing page.
    {
      href: "/dashboard",
      label: t.dashboardNav.overviewHome,
      icon: <LayoutDashboard className={iconClass} />,
      exact: true,
    },
    { href: "/dashboard/lo-trinh", label: t.dashboardNav.roadmapLong, icon: <Route className={iconClass} /> },
    { href: "/dashboard/courses", label: t.dashboardNav.courses, icon: <Video className={iconClass} /> },
    { href: "/dashboard/level-up", label: t.dashboardNav.levelUp, icon: <ArrowUpCircle className={iconClass} /> },
    {
      href: "/dashboard/library",
      label: t.dashboardNav.library,
      icon: <Library className={iconClass} />,
      children: [
        { href: "/dashboard/library/sach", label: t.dashboardNav.libraryBooks, icon: <BookOpen className={iconClass} /> },
        {
          href: "/dashboard/library/tai-lieu",
          label: t.dashboardNav.libraryDocuments,
          icon: <FileText className={iconClass} />,
        },
      ],
    },

    { section: t.dashboardNav.sectionConnect },
    {
      href: "/dashboard/announcements",
      label: t.dashboardNav.announcements,
      icon: <Megaphone className={iconClass} />,
      badge: unreadAnnouncementCount,
    },
    { href: "/dashboard/my-group", label: t.dashboardNav.myTeam, icon: <Users className={iconClass} /> },
    // Chat and whiteboards each have a master switch; a row for a feature
    // that is switched off would be a dead end of a different kind.
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

    // The whole run disappears when selling is off, rather than leaving a
    // heading over nothing.
    ...(salesEnabled
      ? [
          { section: t.dashboardNav.sectionShopping },
          { href: "/dashboard/products", label: t.dashboardNav.products, icon: <Package className={iconClass} /> },
          // The cart had no row at all — only the small icon in the header —
          // while "Đơn hàng của tôi" did, which left the buying flow oddly
          // half-represented in the menu.
          {
            href: "/dashboard/cart",
            label: t.dashboardNav.cart,
            icon: <ShoppingBag className={iconClass} />,
            badge: cartCount,
          },
          { href: "/dashboard/orders", label: t.dashboardNav.orders, icon: <Receipt className={iconClass} /> },
          ...vendorNavItems,
        ]
      : []),

    { section: "" },
    { href: "/dashboard/profile", label: t.dashboardNav.profile, icon: <UserCircle className={iconClass} /> },
    {
      label: t.dashboardNav.comingSoonGroup,
      icon: <Clock className={iconClass} />,
      // No comingSoon tag on the row: the label already IS "Sắp ra mắt", and
      // the component would append the same words again. The children inside
      // need no tag either — the group they sit in says it once.
      children: comingSoonChildren,
    },
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
              {isApprovedVendor && (
                <Link
                  href="/vendor"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary-border-hover hover:text-foreground"
                >
                  <Store className="h-3.5 w-3.5" />
                  {t.dashboardNav.goToVendor}
                </Link>
              )}
              <span className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <UserAvatar src={student.avatarUrl} name={student.name} size={28} className="text-xs" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground">{student.name}</span>
                  <span className="flex items-center gap-1.5">
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
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
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
