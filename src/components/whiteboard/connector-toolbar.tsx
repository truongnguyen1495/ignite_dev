"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CornerDownRight, Minus, Plus, Slash, Spline, Trash2 } from "lucide-react";
import type { ConnectorDash, ConnectorElement, ConnectorKind } from "@/lib/whiteboard-elements";
import { ColorPalettePicker } from "./color-palette-picker";

const iconBtnClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

function toggleBtnClass(active: boolean) {
  return active ? `${iconBtnClass} bg-primary-bg text-primary hover:bg-primary-bg hover:text-primary` : iconBtnClass;
}

const KIND_OPTIONS: { value: ConnectorKind; label: string; icon: typeof Slash }[] = [
  { value: "straight", label: "Đường thẳng", icon: Slash },
  { value: "elbow", label: "Đường gấp khúc", icon: CornerDownRight },
  { value: "curved", label: "Đường cong", icon: Spline },
];

// Small popover (mirrors ShapeKindPicker in selection-toolbar.tsx) for
// switching a connector's routing between straight/elbow/curved.
function KindPicker({ current, onPick }: { current: ConnectorKind; onPick: (kind: ConnectorKind) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = KIND_OPTIONS.find((o) => o.value === current)?.icon ?? Spline;

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
        title="Kiểu đường nối"
        aria-label="Kiểu đường nối"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        className={iconBtnClass}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 flex w-32 -translate-x-1/2 gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          {KIND_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => {
                onPick(value);
                setOpen(false);
              }}
              className={`flex h-9 flex-1 items-center justify-center rounded-lg ${
                current === value ? "bg-primary-bg text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DASH_OPTIONS: { value: ConnectorDash; label: string; previewClass: string }[] = [
  { value: "solid", label: "Nét liền", previewClass: "border-solid" },
  { value: "dashed", label: "Nét đứt", previewClass: "border-dashed" },
  { value: "dotted", label: "Nét chấm", previewClass: "border-dotted" },
];

// No single lucide icon reads as "dashed" vs "dotted" clearly enough on its
// own, so each option renders an actual CSS border preview of that style
// instead — same idea as ShapeKindPicker's icon grid, just swapped for a
// closer visual match to the real stroke.
function DashPicker({ current, onPick }: { current: ConnectorDash; onPick: (dash: ConnectorDash) => void }) {
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
        title="Kiểu nét"
        aria-label="Kiểu nét"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((o) => !o)}
        className={iconBtnClass}
      >
        <span className={`w-4 border-t-2 border-foreground ${DASH_OPTIONS.find((o) => o.value === current)?.previewClass}`} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-1 w-36 -translate-x-1/2 space-y-1 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          {DASH_OPTIONS.map(({ value, label, previewClass }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onPick(value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                current === value ? "bg-primary-bg text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <span className={`w-6 border-t-2 border-current ${previewClass}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Miro-style floating contextual toolbar for a selected connector — mirrors
// selection-toolbar.tsx's element toolbar (same screen-space rendering
// concerns), just for the handful of properties a connector has instead.
export function ConnectorToolbar({
  connector,
  screenX,
  screenY,
  onUpdateConnector,
  onDelete,
}: {
  connector: ConnectorElement;
  screenX: number;
  screenY: number;
  onUpdateConnector: (patch: Partial<ConnectorElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
      style={{ left: screenX, top: screenY - 12 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onUpdateConnector({ arrowStart: !connector.arrowStart })}
        title="Mũi tên đầu"
        aria-label="Mũi tên đầu"
        aria-pressed={connector.arrowStart}
        className={toggleBtnClass(connector.arrowStart)}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onUpdateConnector({ arrowEnd: !connector.arrowEnd })}
        title="Mũi tên cuối"
        aria-label="Mũi tên cuối"
        aria-pressed={connector.arrowEnd}
        className={toggleBtnClass(connector.arrowEnd)}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <KindPicker current={connector.kind} onPick={(kind) => onUpdateConnector({ kind })} />
      <DashPicker current={connector.dash} onPick={(dash) => onUpdateConnector({ dash })} />
      <ColorPalettePicker value={connector.stroke} onChange={(stroke) => onUpdateConnector({ stroke })} title="Màu đường nối" />
      <div className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={() => onUpdateConnector({ strokeWidth: Math.max(1, connector.strokeWidth - 1) })}
        title="Nét mỏng hơn"
        aria-label="Nét mỏng hơn"
        className={iconBtnClass}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-5 text-center text-xs text-muted">{connector.strokeWidth}</span>
      <button
        type="button"
        onClick={() => onUpdateConnector({ strokeWidth: Math.min(12, connector.strokeWidth + 1) })}
        title="Nét dày hơn"
        aria-label="Nét dày hơn"
        className={iconBtnClass}
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <button type="button" onClick={onDelete} title="Xóa (Delete)" aria-label="Xóa" className={`${iconBtnClass} hover:bg-danger-bg hover:text-danger`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
