"use client";

import { useEffect, useRef, useState } from "react";

// A reasonable general-purpose 16-swatch grid (not a pixel copy of any
// specific app's palette) — light neutrals through saturated hues, ending
// in dark/black, arranged so a sticky-note-friendly pastel is always within
// the first row.
const PRESET_COLORS = [
  "#ffffff", "#f8f9fa", "#ffd43b", "#ffa94d",
  "#ff8787", "#f06595", "#e599f7", "#b197fc",
  "#91a7ff", "#74c0fc", "#66d9e8", "#63e6be",
  "#8ce99a", "#c0eb75", "#495057", "#212529",
];

// Click-to-open grid of preset colors (Miro-style quick color picking),
// with a "Khác..." escape hatch to the browser's own color picker for
// anything not in the grid. Used by selection-toolbar.tsx and
// property-panel.tsx wherever a plain `<input type="color">` used to be —
// picking one of 16 swatches is faster than the OS picker for the common
// case, without losing the ability to pick an exact color.
export function ColorPalettePicker({ value, onChange, title }: { value: string; onChange: (color: string) => void; title: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-surface-hover"
      >
        <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: value }} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 w-40 -translate-x-1/2 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full border ${value === color ? "border-primary ring-2 ring-primary" : "border-border"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted hover:bg-surface-hover">
            Khác...
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-0 w-0 opacity-0"
            />
          </label>
        </div>
      )}
    </div>
  );
}
