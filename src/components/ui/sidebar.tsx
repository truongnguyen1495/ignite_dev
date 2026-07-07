"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  // A pre-rendered icon element (e.g. <Users className="h-4 w-4" />), not a
  // component reference — Server Components can't pass function/component
  // types to Client Components as props, only already-rendered JSX.
  icon: React.ReactNode;
  exact?: boolean;
};

export function Sidebar({
  items,
  brand,
}: {
  items: NavItem[];
  brand: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-6 py-6">{brand}</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
