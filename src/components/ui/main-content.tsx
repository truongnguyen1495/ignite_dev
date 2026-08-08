"use client";

import { usePathname } from "next/navigation";

// A board editor wants its canvas to fill essentially the whole viewport
// (Miro-style — see whiteboard-editor.tsx), which the padded/max-width
// wrapper every other page in a section shares fights directly:
// px-4/py-6/sm:px-8/sm:py-8 plus a centered max-w-7xl box shrank the canvas
// down to a small centered rectangle instead of filling the screen.
// admin/layout.tsx and dashboard/layout.tsx are both Server Components
// (server-only data), so neither can read the current route itself to
// conditionally drop that wrapper — this small client component does, via
// usePathname, and is the ONLY thing that varies per route. Shared by both
// sections (not "AdminMainContent"-only) since the same full-bleed need
// applies to the student whiteboard editor route too — each caller passes
// its own fullBleedPattern rather than this component hardcoding either
// section's paths. Takes the pattern as a plain STRING (a RegExp source),
// not a RegExp instance — a Server Component can only pass plain
// serializable values as props to a "use client" component like this one;
// an actual RegExp instance fails at runtime ("Only plain objects... can be
// passed to Client Components").
export function MainContent({
  children,
  fullBleedPattern,
}: {
  children: React.ReactNode;
  fullBleedPattern: string;
}) {
  const pathname = usePathname();
  if (new RegExp(fullBleedPattern).test(pathname)) {
    return <main className="min-h-0 flex-1">{children}</main>;
  }
  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </main>
  );
}
