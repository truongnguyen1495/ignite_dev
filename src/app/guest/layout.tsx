import Link from "next/link";
import { Home, Megaphone, Video, LogIn, UserPlus, Library } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { isChatEnabled } from "@/lib/access";
import { getDictionary } from "@/lib/i18n/get-locale";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { GuestChatWidget } from "./guest-chat-widget";

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
          <div className="flex items-center gap-2 text-sm">
            <LanguageSwitcher />
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
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-8">
          <Link
            href="/guest"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            {t.guestNav.home}
          </Link>
          <Link
            href="/guest/announcements"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Megaphone className="h-4 w-4" />
            {t.guestNav.announcements}
          </Link>
          <Link
            href="/guest/courses"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Video className="h-4 w-4" />
            {t.guestNav.exclusiveCourses}
          </Link>
          <Link
            href="/guest/library"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Library className="h-4 w-4" />
            {t.guestNav.library}
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</main>
      {chatEnabled && <GuestChatWidget />}
    </div>
  );
}
