"use client";

import { useState, type ReactNode } from "react";

export type TabDef = { id: string; label: string; count?: number; content: ReactNode };

// Client-side tab switcher over already-server-rendered panel content (each
// tab's `content` is real JSX built from a Server Component's data fetch,
// not re-fetched on switch) — same "already-rendered JSX crosses the
// Server/Client boundary fine, component references don't" rule as
// Sidebar's NavItem.icon (see the gotcha noted in src/lib/access.ts's
// sibling files). Used by /admin/groups/[groupId] to switch between
// Thành viên / Nhiệm vụ hàng ngày / Giải trình chờ duyệt without a
// full-page navigation.
export function TabsShell({ tabs, defaultTabId }: { tabs: TabDef[]; defaultTabId?: string }) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeId}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveId(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              tab.id === activeId ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab.id === activeId ? "bg-primary-bg text-primary" : "bg-faint-bg text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {active && (
        <div role="tabpanel" id={`tabpanel-${active.id}`} aria-labelledby={`tab-${active.id}`} className="p-5">
          {active.content}
        </div>
      )}
    </div>
  );
}
