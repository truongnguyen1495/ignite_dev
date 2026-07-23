"use client";

import { useState, useSyncExternalStore } from "react";
import { FileText, BookOpen } from "lucide-react";
import { PdfFlipbook } from "./pdf-flipbook";

type Mode = "plain" | "flipbook";

// iOS Safari (every browser on iOS is Safari's engine underneath) renders a
// PDF inside an <iframe> as just its FIRST page — no scrolling, no zoom —
// so the "plain" viewer mode is unusable there. Modern iPads deliberately
// report a desktop-Mac user agent, so UA sniffing alone misses them; a Mac
// platform that also reports touch points is an iPad.
function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Wraps the two ways to read a library PDF: the plain native browser viewer
// (an <iframe>, unchanged from before — keeps zoom/search/text-select) and
// the flipbook page-turn effect (PdfFlipbook). `src` is the same
// access-gated API route either way (/api/library/[itemId]/file or
// /preview) — switching modes never changes what the visitor is allowed to
// read, only how it's displayed.
//
// On iOS the plain mode is hidden entirely and flipbook (which rasterizes
// pages itself via pdfjs, so it works everywhere) becomes the default — see
// isIosDevice above. Read via useSyncExternalStore (server snapshot false,
// never changes → noop subscribe) rather than initial state, so the
// server-rendered markup stays identical for hydration without an
// effect-then-setState round trip.
const subscribeNever = () => () => {};

export function PdfReader({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const isIos = useSyncExternalStore(subscribeNever, isIosDevice, () => false);
  const [mode, setMode] = useState<Mode>("plain");
  // "plain" is only the stored default — on iOS the plain button doesn't
  // exist, so a still-default "plain" simply means "flipbook" there.
  const effectiveMode = isIos && mode === "plain" ? "flipbook" : mode;

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5">
        {!isIos && (
          <button
            type="button"
            onClick={() => setMode("plain")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              effectiveMode === "plain" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Xem thường
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("flipbook")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            effectiveMode === "flipbook" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Xem flipbook
        </button>
      </div>

      {effectiveMode === "plain" ? (
        <iframe
          src={src}
          className="h-[80vh] supports-[height:100dvh]:h-[80dvh] w-full rounded-xl border border-border"
          title={title}
        />
      ) : (
        <PdfFlipbook src={src} title={title} />
      )}
    </div>
  );
}
