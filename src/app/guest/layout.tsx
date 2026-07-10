import Link from "next/link";
import { Megaphone, Video, LogIn, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

// Public shell for the /guest/* tree — deliberately outside SidebarProvider
// and requireActiveStudent: no session is ever read here. middleware.ts's
// matcher only covers /dashboard and /admin, so this route needs no changes
// there to stay unauthenticated.
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-8">
          <BrandLogo subtitle="Khách" />
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <UserPlus className="h-4 w-4" />
              Đăng ký
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-8">
          <Link
            href="/guest/announcements"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Megaphone className="h-4 w-4" />
            Bản tin
          </Link>
          <Link
            href="/guest/courses"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Video className="h-4 w-4" />
            Khóa học độc quyền
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
