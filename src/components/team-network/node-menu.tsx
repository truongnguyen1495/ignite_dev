"use client";

import { useEffect, useRef } from "react";

export type NodeMenuAction = "view" | "edit" | "status" | "leader" | "focus" | "downline" | "locate" | "delete";

// "node" is the menu on a map card; "row" is the one on a table row, which has no use for
// "focus on this branch" but does for "show me on the map" and delete.
export type NodeMenuVariant = "node" | "row";

type Item = { action: NodeMenuAction; label: string; divider?: boolean; danger?: boolean };

const ROW_ITEMS: Item[] = [
  { action: "locate", label: "Xem trên sơ đồ" },
  { action: "view", label: "Xem hồ sơ" },
  { action: "edit", label: "Sửa chi tiết…" },
  { action: "status", label: "Đổi trạng thái…" },
  { action: "delete", label: "Xóa khỏi mạng lưới…", divider: true, danger: true },
];

const ITEMS: Item[] = [
  { action: "view", label: "Xem hồ sơ" },
  { action: "edit", label: "Sửa thành viên" },
  { action: "status", label: "Đổi trạng thái" },
  { action: "leader", label: "Đổi Leader" },
  { action: "focus", label: "Tập trung vào nhánh này", divider: true },
  { action: "downline", label: "Xem downline" },
];

// The "…" menu on a card. Positioned in the viewport (not inside the canvas, whose
// transform would move it) at the button that opened it, and gone as soon as the
// admin clicks elsewhere, scrolls, or presses Escape.
export function NodeMenu({
  x,
  y,
  isRoot,
  variant = "node",
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  isRoot: boolean;
  variant?: NodeMenuVariant;
  onAction: (action: NodeMenuAction) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  // Keep the menu on screen near the bottom and right edges.
  const left = Math.min(x, (typeof window === "undefined" ? x : window.innerWidth) - 220);
  const top = Math.min(y + 4, (typeof window === "undefined" ? y : window.innerHeight) - 240);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[13rem] rounded-xl border border-primary-border bg-surface p-1 shadow-xl"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      {(variant === "row" ? ROW_ITEMS : ITEMS).filter((i) => !(isRoot && i.action === "leader")).map((item) => {
        // The root cannot be deleted; the item stays so the admin sees why it is missing.
        const blocked = isRoot && item.action === "delete";
        return (
          <div key={item.action}>
            {item.divider && <hr className="my-1 border-border" />}
            <button
              type="button"
              role="menuitem"
              disabled={blocked}
              title={blocked ? "Gốc mạng lưới không xóa được" : undefined}
              onClick={() => onAction(item.action)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                item.danger ? "text-danger" : "text-foreground"
              }`}
            >
              {item.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
