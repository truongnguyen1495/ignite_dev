"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type HocSinhNavItem = {
  href: string;
  label: string;
  // Pre-rendered icon element, not a component reference — same reasoning
  // as NavItem in src/components/ui/sidebar.tsx (Server -> Client boundary
  // can't pass component types, only already-rendered JSX).
  icon: React.ReactNode;
  exact?: boolean;
};

export function HocSinhNav({ items }: { items: HocSinhNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-8">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors ${
              active ? "bg-primary-bg text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
