"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { ChevronDown, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
};

function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const SidebarContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
} | null>(null);

function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}

// Safe to call from components rendered both inside a SidebarProvider (the
// admin/dashboard shells) and outside one (guest/login pages reuse BrandLogo
// too) — returns `false` instead of throwing when there's no provider, since
// those routes have no collapse state to speak of.
export function useSidebarCollapsed(): boolean {
  const ctx = useContext(SidebarContext);
  return ctx?.collapsed ?? false;
}

// Owns two independent visibility states shared between the drawer/rail
// (Sidebar) and their toggle buttons, which live in separate Server
// Component subtrees (aside vs. header) and so can't share plain React
// state: `open` is the mobile drawer (unaffected by `collapsed` — a
// `md:`-prefixed class always wins on desktop regardless of `open`, and
// `open`'s unprefixed classes have no effect below the md breakpoint, so the
// two states never fight over the same viewport). `collapsed` is the
// desktop rail's persistent hide/show, remembered across reloads.
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Always starts `false` (matching the server-rendered markup, which has no
  // access to localStorage) and is corrected right after mount in the effect
  // below — reading localStorage directly in the initializer made the
  // CLIENT's very first render disagree with the server's HTML, which React
  // logs as a hydration mismatch and explicitly does NOT patch up (the
  // mismatched attributes just silently keep the server's stale values
  // forever). One extra expanded-then-collapsed flash on load is the
  // acceptable trade-off.
  const [collapsed, setCollapsedState] = useState(false);
  useEffect(() => {
    // Syncing from an external store (localStorage) on mount, not reacting
    // to a prop/state change — the one case this lint rule's own guidance
    // calls out as legitimate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsedState(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);
  function setCollapsed(next: boolean) {
    setCollapsedState(next);
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  }
  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, setCollapsed }}>
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
      // No negative margin here (was -ml-2, pulling the button flush against
      // the header's own left padding, i.e. very close to the true screen
      // edge on mobile) — iOS Safari/WKWebView reserves a hit-testing zone
      // along the left edge for its system "swipe to go back" gesture and
      // can consume a touch that starts inside it before the page's own
      // JavaScript ever sees the event (confirmed on a real device: not
      // even a document-level touchstart listener fired for a tap there).
      // Kept at least the header's own px-4/px-8 as clearance from the edge
      // instead of pulling closer to it.
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

// Desktop-only counterpart to SidebarToggle above — collapses the always-on
// rail down to an icon-only strip (rather than hiding the mobile drawer).
// Lives inline in the rail's own header (a child of <aside> in Sidebar
// below), same spot in both states, since the rail itself never drops to 0
// width anymore — nothing to strand the button outside a reachable area.
function SidebarCollapseToggle({ collapsed, onToggle, navy }: { collapsed: boolean; onToggle: () => void; navy: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Hiện menu" : "Ẩn menu"}
      title={collapsed ? "Hiện menu" : "Ẩn menu"}
      className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors md:flex ${
        navy
          ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
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
  const { open, setOpen, collapsed, setCollapsed } = useSidebar();
  const navy = variant === "navy";
  // Explicit user toggles override the "expand while a child route is
  // active" default — undefined means "use the default" for that item.
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});

  // Every `collapsed`-conditional class below is `md:`-prefixed on purpose:
  // `collapsed` is a single desktop-rail preference with no viewport
  // awareness of its own, but the SAME <nav> markup also renders inside the
  // mobile drawer (driven by `open`, not `collapsed`) — a person who had
  // collapsed the desktop rail on a previous visit must still see full
  // labels when they open the hamburger drawer on a phone. Unprefixed
  // classes would hide them there too, since `collapsed` is `true`
  // regardless of which viewport rendered this render pass.
  const linkClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      collapsed ? "md:justify-center md:gap-0 md:px-2" : ""
    } ${
      active
        ? "bg-primary text-primary-foreground"
        : navy
          ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
    }`;
  const collapsibleClass = collapsed ? "md:hidden" : "";

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-overlay-strong md:hidden"
        />
      )}
      <aside
        // pointer-events-none when closed on mobile is defense-in-depth
        // alongside the -translate-x-full transform, not redundant with it:
        // old WebKit (pre-16 iOS Safari) has a known bug where a `position:
        // fixed` element combined with a `transform` can keep hit-testing
        // its pre-transform bounding box, so a "closed" (translated
        // off-screen) sidebar can still swallow taps in its old on-screen
        // footprint — exactly the region the mobile hamburger button
        // (SidebarToggle) sits in. Same "don't rely on a visual-only
        // property to stay click-through" lesson as the toast tray fix
        // (see toast.tsx). The md: variants below are unconditional-vs-`open`
        // (mobile's `open` has no `md:` prefix, so it never affects desktop):
        // `collapsed` only ever shrinks the rail's width on desktop, it never
        // needs its own pointer-events override since the rail stays a real,
        // clickable, non-zero-width element in both states.
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden border-r transition-[width,transform] duration-200 ease-out md:sticky md:top-0 md:z-auto md:h-screen ${
          navy ? "border-sidebar-hover bg-sidebar" : "border-border bg-surface"
        } ${open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"} ${
          collapsed ? "md:w-[72px] md:translate-x-0 md:pointer-events-auto" : "md:w-64 md:translate-x-0 md:pointer-events-auto"
        }`}
      >
        <div className={`flex items-center justify-between gap-2 px-4 py-6 ${collapsed ? "md:flex-col md:justify-center" : ""}`}>
          {collapsed ? (
            // Collapsed desktop rail has no room for both the logo AND a
            // separate toggle button (see the expanded branch's button
            // below) — the logo itself becomes the expand affordance
            // instead. Harmless on mobile: `collapsed` doesn't affect
            // mobile layout at all (see the `collapsibleClass` comment
            // above), so this button just wraps the same full brand
            // content the plain `<div>` branch would.
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Hiện menu"
              title="Hiện menu"
              className="min-w-0 flex-1 md:flex-none"
            >
              {brand}
            </button>
          ) : (
            <div className="min-w-0 flex-1">{brand}</div>
          )}
          {!collapsed && <SidebarCollapseToggle collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} navy={navy} />}
        </div>
        <nav className={`flex-1 space-y-1 overflow-y-auto px-3 ${collapsed ? "md:px-2" : ""}`}>
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const hasChildren = !!item.children?.length;
            const childActive = hasChildren && item.children!.some((c) => pathname.startsWith(c.href));
            const expanded = expandOverrides[item.href] ?? childActive;

            return (
              <div key={item.href}>
                <div className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`${linkClasses(active)} flex-1`}
                  >
                    {item.icon}
                    <span className={`flex-1 truncate ${collapsibleClass}`}>{item.label}</span>
                    {!!item.badge && (
                      <span className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground ${collapsibleClass}`}>
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
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${collapsibleClass} ${
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
                  <div className={`mt-1 space-y-1 border-l border-current/10 pl-3 ${collapsibleClass}`}>
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
