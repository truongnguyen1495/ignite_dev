import Link from "next/link";
import { Home, Megaphone, Video, LogIn, UserPlus, Library, Package, Store } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { isChatEnabled } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/get-locale";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstallAppButton } from "@/components/install-app-button";
import { GuestChatWidget } from "./guest-chat-widget";
import { GuestNav } from "./guest-nav";

// Public shell for the /guest/* tree — deliberately outside SidebarProvider
// and requireActiveStudent: no session is ever read here. middleware.ts's
// matcher only covers /dashboard and /admin, so this route needs no changes
// there to stay unauthenticated.
export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const chatEnabled = await isChatEnabled();
  const { t } = await getDictionary();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-8">
          <BrandLogo subtitle={t.brandSubtitle.guest} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <InstallAppButton />
            <LanguageSwitcher />
            {/* Deliberately a plain outline link, not the primary "Đăng ký"
                button's style — becoming a vendor is a different intent from
                becoming a student, and open to non-students too (see
                requireVendorAccountAccess), so it must read as a separate
                path rather than a variant of student sign-up. */}
            <Link
              href="/vendor/dang-ky"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <Store className="h-4 w-4" />
              {t.guestNav.becomeVendor}
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <LogIn className="h-4 w-4" />
              {t.guestNav.login}
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" />
              {t.guestNav.register}
            </Link>
          </div>
        </div>
        <GuestNav
          items={[
            { href: "/guest", label: t.guestNav.home, icon: <Home className="h-4 w-4" />, exact: true },
            {
              href: "/guest/announcements",
              label: t.guestNav.announcements,
              icon: <Megaphone className="h-4 w-4" />,
            },
            {
              href: "/guest/courses",
              label: t.guestNav.exclusiveCourses,
              icon: <Video className="h-4 w-4" />,
            },
            { href: "/guest/library", label: t.guestNav.library, icon: <Library className="h-4 w-4" /> },
            { href: "/guest/products", label: t.guestNav.products, icon: <Package className="h-4 w-4" /> },
            {
              href: "/vendor/dang-ky",
              label: t.guestNav.vendorRegister,
              icon: <Store className="h-4 w-4" />,
            },
          ]}
        />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</main>
      {chatEnabled && <GuestChatWidget />}
    </div>
  );
}
