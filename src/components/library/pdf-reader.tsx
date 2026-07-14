"use client";

import { useState } from "react";
import { FileText, BookOpen } from "lucide-react";
import { PdfFlipbook } from "./pdf-flipbook";

type Mode = "plain" | "flipbook";

// Wraps the two ways to read a library PDF: the plain native browser viewer
// (an <iframe>, unchanged from before — keeps zoom/search/text-select) and
// the flipbook page-turn effect (PdfFlipbook). `src` is the same
// access-gated API route either way (/api/library/[itemId]/file or
// /preview) — switching modes never changes what the visitor is allowed to
// read, only how it's displayed.
export function PdfReader({
  src,
  title,
  backgroundImageUrl,
}: {
  src: string;
  title: string;
  backgroundImageUrl?: string | null;
}) {
  const [mode, setMode] = useState<Mode>("plain");

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => setMode("plain")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "plain" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Xem thường
        </button>
        <button
          type="button"
          onClick={() => setMode("flipbook")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "flipbook" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Xem flipbook
        </button>
      </div>

      {mode === "plain" ? (
        <iframe src={src} className="h-[80vh] w-full rounded-xl border border-border" title={title} />
      ) : (
        <PdfFlipbook src={src} title={title} backgroundImageUrl={backgroundImageUrl} />
      )}
    </div>
  );
}
