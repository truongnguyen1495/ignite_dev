"use client";

import { Zap } from "lucide-react";
import { useSidebarCollapsed } from "@/components/ui/sidebar";

export function BrandLogo({
  subtitle,
  variant = "light",
}: {
  subtitle?: string;
  variant?: "navy" | "light";
}) {
  const navy = variant === "navy";
  // Outside a SidebarProvider (guest/login pages also render BrandLogo) this
  // is always false, so the wordmark shows in full there regardless.
  //
  // `md:`-prefixed below, not a plain `!collapsed` conditional: `collapsed`
  // has no viewport awareness of its own, but this same component also
  // renders inside the mobile drawer — a desktop icon-rail preference must
  // not also strip the wordmark down there. See the matching comment on
  // `collapsibleClass` in sidebar.tsx.
  const collapsed = useSidebarCollapsed();
  const collapsibleClass = collapsed ? "md:hidden" : "";
  return (
    <div>
      <div className={`flex items-center gap-2 ${collapsed ? "md:justify-center" : ""}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </span>
        <span className={`text-lg font-bold ${collapsibleClass} ${navy ? "text-sidebar-foreground" : "text-foreground"}`}>
          IGNITE <span className="text-primary">VIETNAM</span>
        </span>
      </div>
      {subtitle && (
        <p className={`mt-1 text-xs ${collapsibleClass} ${navy ? "text-sidebar-muted" : "text-muted"}`}>{subtitle}</p>
      )}
    </div>
  );
}
