"use client";

import Image from "next/image";
import { useSidebarCollapsed } from "@/components/ui/sidebar";
import wordmark from "../../public/brand/rapidx-wordmark-dark.png";
import mark from "../../public/brand/rapidx-mark.png";

export function BrandLogo({
  subtitle,
  variant = "light",
}: {
  subtitle?: string;
  // Kept even though both branches resolve to the same tokens today: the rail
  // and the page shell only *happen* to share a ground since the app went
  // dark, and --sidebar-* exists precisely so the rail can diverge again.
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
  return (
    <div>
      <div className={`flex items-center ${collapsed ? "md:justify-center" : ""}`}>
        {/* Both marks are raster: the wordmark is a rendered 3D logo with
            bevels and a gradient sweep, so there is no SVG of it to inline
            and nothing here is recolourable by CSS. It doesn't need to be —
            the cream-on-transparent cut sits on every ground the app has. */}
        <Image
          src={wordmark}
          alt="RapidX"
          priority
          className={`h-auto w-[168px] ${collapsed ? "md:hidden" : ""}`}
        />
        {collapsed && (
          <Image src={mark} alt="RapidX" priority className="hidden h-9 w-9 md:block" />
        )}
      </div>
      {subtitle && (
        <p
          className={`mt-1.5 text-xs ${collapsed ? "md:hidden" : ""} ${
            navy ? "text-sidebar-muted" : "text-muted"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
