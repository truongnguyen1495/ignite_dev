"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { Menu, X } from "lucide-react";

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
};

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
  const { open, setOpen } = useSidebar();
  const navy = variant === "navy";

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
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : navy
                      ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
