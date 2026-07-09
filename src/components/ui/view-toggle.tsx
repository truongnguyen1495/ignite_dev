"use client";

import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Dạng lưới"
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          mode === "grid" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="Dạng danh sách"
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          mode === "list" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
