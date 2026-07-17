"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type GuestNavItem = {
  href: string;
  label: string;
  // Pre-rendered icon element, not a component reference — same RSC
  // boundary rule as sidebar.tsx's NavItem.icon.
  icon: React.ReactNode;
  exact?: boolean;
};

export function GuestNav({ items }: { items: GuestNavItem[] }) {
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
  );
}
