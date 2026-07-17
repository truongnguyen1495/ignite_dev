"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

type QueryCondition = { param: string; value: string };

export type NavItem = {
  href: string;
  label: string;
  // A pre-rendered icon element (e.g. <Users className="h-4 w-4" />), not a
  // component reference — Server Components can't pass function/component
  // types to Client Components as props, only already-rendered JSX.
  icon: React.ReactNode;
  exact?: boolean;
  // Unread-style count pill shown after the label, e.g. for "Bản tin". Only
  // rendered when > 0.
  badge?: number;
  // Nested items shown collapsed under the parent, e.g. "Bài học"/"Kết
  // quả"/"Yêu cầu lên cấp" under "Học viên" — collapsed by default, expands
  // automatically when the active route is one of the children (see the
  // active-child check in Sidebar) so it never hides where you currently are.
  children?: NavItem[];
  // "Học viên" (/admin/students) and "Học sinh" (/admin/prospective-students)
  // share one detail route (/admin/students/[studentId]) for both kinds of
  // account — plain prefix matching would always credit "Học viên", even
  // when viewing a "học sinh" record. The "Học sinh" list link appends
  // ?from=prospective so this item claims the shared route instead, and
  // "Học viên" suppresses its own match for that same query — see isNavItemActive.
  altActiveHrefPrefix?: string;
  altActiveQuery?: QueryCondition;
  suppressActiveQuery?: QueryCondition;
};

function isNavItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams): boolean {
  const baseActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const suppressed = item.suppressActiveQuery && searchParams.get(item.suppressActiveQuery.param) === item.suppressActiveQuery.value;
  const altActive =
    !!item.altActiveHrefPrefix &&
    pathname.startsWith(item.altActiveHrefPrefix) &&
    (!item.altActiveQuery || searchParams.get(item.altActiveQuery.param) === item.altActiveQuery.value);
  return (baseActive && !suppressed) || altActive;
}

const SidebarContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(
  null
);

function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}

// Owns the mobile open/closed state shared between the drawer (Sidebar) and
// the hamburger button (SidebarToggle), which live in separate Server
// Component subtrees (aside vs. header) and so can't share plain React state.
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="flex min-h-screen">{children}</div>
    </SidebarContext.Provider>
  );
}

export function SidebarToggle() {
  const { open, setOpen } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={open ? "Đóng menu" : "Mở menu"}
      className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

export function Sidebar({
  items,
  brand,
  variant = "light",
}: {
  items: NavItem[];
  brand: React.ReactNode;
  // Admin uses the navy rail; the student dashboard keeps the light shell —
  // see globals.css for why the navy variant needs its own text tokens.
  variant?: "navy" | "light";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open, setOpen } = useSidebar();
  const navy = variant === "navy";
  // Explicit user toggles override the "expand while a child route is
  // active" default — undefined means "use the default" for that item.
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});

  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : navy
          ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
    }`;

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 ease-out md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 ${
          navy ? "border-sidebar-hover bg-sidebar" : "border-border bg-surface"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-6 py-6">{brand}</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => {
            const active = isNavItemActive(item, pathname, searchParams);
            const hasChildren = !!item.children?.length;
            const childActive = hasChildren && item.children!.some((c) => pathname.startsWith(c.href));
            const expanded = expandOverrides[item.href] ?? childActive;

            return (
              <div key={item.href}>
                <div className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`${linkClasses(active)} flex-1`}
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setExpandOverrides((o) => ({ ...o, [item.href]: !expanded }))}
                      aria-label={expanded ? `Thu gọn ${item.label}` : `Mở rộng ${item.label}`}
                      aria-expanded={expanded}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        navy
                          ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                          : "text-muted hover:bg-surface-hover hover:text-foreground"
                      }`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
                {hasChildren && expanded && (
                  <div className="mt-1 space-y-1 border-l border-current/10 pl-3">
                    {item.children!.map((child) => {
                      const childIsActive = child.exact
                        ? pathname === child.href
                        : pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={linkClasses(childIsActive)}
                        >
                          {child.icon}
                          <span className="flex-1 truncate">{child.label}</span>
                          {!!child.badge && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
