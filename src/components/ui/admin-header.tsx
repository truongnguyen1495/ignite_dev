"use client";

import { usePathname } from "next/navigation";

// Same route-detection reasoning as main-content.tsx's MainContent (this
// lives next to it, and takes the pattern the same way — a plain
// RegExp-source string, since a Server Component parent can't pass an
// actual RegExp instance to a Client Component prop) — the whiteboard
// editor's canvas fills the whole page and doesn't want any of this
// section-wide chrome (account badge, language switch, logout) competing
// for space or attention; the editor has its own minimal floating
// back-link/title/share/save pills (see whiteboard-editor.tsx). Getting
// back to another page or logging out just means navigating away first —
// an accepted trade-off for keeping this page's chrome minimal. Shared by
// both admin/layout.tsx and dashboard/layout.tsx (each passes its own
// fullBleedPattern) rather than duplicated, same reasoning as MainContent.
// `children` is an escape hatch for a header shape that doesn't fit the
// left/right two-column layout at all — dashboard/layout.tsx's "học sinh"
// (grantedLevel null) branch renders a brand logo + actions row AND a
// second nav row (HocSinhNav) stacked inside one <header>, not a simple
// left/right split. When `children` is passed, `className` replaces the
// default header classes wholesale (its own header isn't the padded
// flex row the default shell renders) and left/right are ignored.
export function AppHeader({
  left,
  right,
  fullBleedPattern,
  className,
  children,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  fullBleedPattern: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  if (new RegExp(fullBleedPattern).test(pathname)) {
    return null;
  }
  if (children) {
    return <header className={className ?? "border-b border-border bg-surface"}>{children}</header>;
  }
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">{right}</div>
    </header>
  );
}
