"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// Same "variant prop" pattern as Sidebar/BrandLogo's navy/light split — a
// "dark" bar floating over an admin-set background image (see FlipbookChrome)
// needs white-on-translucent-black styling that the default light/bordered
// buttons (used everywhere else in this app) can't read against a photo.
const VARIANT_CLASSES = {
  light: {
    btn: "flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-hover disabled:opacity-40",
    btnActive: "border-primary text-primary",
    label: "text-muted",
    divider: "bg-border",
  },
  dark: {
    btn: "flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-30",
    btnActive: "bg-white/20",
    label: "text-white",
    divider: "bg-white/20",
  },
};

// Shared control bar for both BookFlipbook and PdfFlipbook — page nav
// (first/prev/next/last), a zoom toggle, and a fullscreen toggle. Purely
// presentational; each caller owns its own flipRef/zoom/fullscreen state and
// just wires callbacks through.
export function FlipbookToolbar({
  pageLabel,
  onFirst,
  onPrev,
  onNext,
  onLast,
  canPrev,
  canNext,
  zoomed,
  onToggleZoom,
  isFullscreen,
  onToggleFullscreen,
  muted,
  onToggleMuted,
  variant = "light",
}: {
  pageLabel: string;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  canPrev: boolean;
  canNext: boolean;
  zoomed: boolean;
  onToggleZoom: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  muted: boolean;
  onToggleMuted: () => void;
  variant?: "light" | "dark";
}) {
  const c = VARIANT_CLASSES[variant];
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 text-sm ${c.label}`}>
      <button type="button" onClick={onFirst} disabled={!canPrev} className={c.btn} aria-label="Trang đầu">
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onPrev} disabled={!canPrev} className={c.btn} aria-label="Trang trước">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[6rem] text-center">{pageLabel}</span>
      <button type="button" onClick={onNext} disabled={!canNext} className={c.btn} aria-label="Trang sau">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button type="button" onClick={onLast} disabled={!canNext} className={c.btn} aria-label="Trang cuối">
        <ChevronsRight className="h-4 w-4" />
      </button>
      <span className={`mx-1 h-5 w-px ${c.divider}`} />
      <button
        type="button"
        onClick={onToggleZoom}
        aria-pressed={zoomed}
        aria-label={zoomed ? "Thu nhỏ" : "Phóng to"}
        title={zoomed ? "Thu nhỏ" : "Phóng to — kéo để xem, bấm lại để thu về"}
        className={`${c.btn} ${zoomed ? c.btnActive : ""}`}
      >
        {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        className={c.btn}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onToggleMuted}
        aria-pressed={!muted}
        aria-label={muted ? "Bật âm thanh lật trang" : "Tắt âm thanh lật trang"}
        title={muted ? "Bật âm thanh lật trang" : "Tắt âm thanh lật trang"}
        className={c.btn}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
