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
export function AppHeader({
  left,
  right,
  fullBleedPattern,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  fullBleedPattern: string;
}) {
  const pathname = usePathname();
  if (new RegExp(fullBleedPattern).test(pathname)) {
    return null;
  }
  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">{right}</div>
    </header>
  );
}
