"use client";

import { createContext, useContext, useRef } from "react";
import { BaseEdge, getBezierPath, Handle, Position, useStore, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import { MoreHorizontal } from "lucide-react";
import { NETWORK_STATUS_CONFIG, NETWORK_STATUS_ORDER, type NetworkStatus } from "@/lib/network-status";
import type { StatusCounts } from "@/lib/network-tree";
import type { LayoutDirection } from "@/lib/network-layout";
import { InitialsAvatar, StatusPill, idLabel } from "./network-ui";

// What a card needs to draw itself. Computed once per change of the tree, so
// panning and zooming (which never touch this) cost nothing.
export type TreeNodeData = {
  id: string;
  kind: "member" | "bucket";
  /**  member = plain card, branch = branch head with a status bar, card = compact summary */
  variant: "member" | "branch" | "card";
  name: string;
  igniteId: string | null;
  status: NetworkStatus | null;
  team: string | null;
  branch: string;
  downline: number;
  hasKids: boolean;
  folded: boolean;
  stats: StatusCounts | null;
  dim: boolean;
  selected: boolean;
  onPath: boolean;
  direction: LayoutDirection;
  /** Show the "…" action menu (not on compact summary cards). */
  actions: boolean;
  [key: string]: unknown;
};

export type TreeNode = Node<TreeNodeData, "tree">;

// Handlers live in context rather than in node data, so a node's data does not
// change identity every time the parent re-renders and React Flow can skip
// untouched cards.
export type TreeActions = {
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onFocusBranch: (id: string) => void;
  onMenu: (id: string, anchor: DOMRect) => void;
};

export const TreeActionsContext = createContext<TreeActions | null>(null);

function useActions(): TreeActions {
  const ctx = useContext(TreeActionsContext);
  if (!ctx) throw new Error("TreeActionsContext is missing");
  return ctx;
}

function StatusBar({ stats }: { stats: StatusCounts }) {
  if (stats.total === 0) return null;
  return (
    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-faint-bg" aria-hidden="true">
      {NETWORK_STATUS_ORDER.map((s) =>
        stats[s] > 0 ? <span key={s} className={NETWORK_STATUS_CONFIG[s].dot} style={{ width: `${(stats[s] / stats.total) * 100}%` }} /> : null
      )}
    </div>
  );
}

export function TreeNodeView({ data, sourcePosition, targetPosition }: NodeProps<TreeNode>) {
  const actions = useActions();
  // Far zoomed out the details are unreadable anyway; keep the name and the
  // status colour so a big network still reads at a glance.
  const low = useStore((s) => s.transform[2] < 0.5);
  const down = useRef<{ x: number; y: number } | null>(null);

  const status = data.status ? NETWORK_STATUS_CONFIG[data.status] : null;
  const toggleLabel = data.folded ? `+${data.downline}` : "▾";
  const showToggle = data.hasKids && data.variant !== "card";

  const frame = `relative flex h-full w-full cursor-pointer flex-col overflow-visible rounded-xl border bg-surface text-left shadow-sm transition-[border-color,box-shadow,opacity] before:absolute before:bottom-2.5 before:left-0 before:top-2.5 before:w-1 before:rounded-r ${
    status ? status.stripe : "before:bg-faint"
  } ${data.kind === "bucket" ? "border-dashed" : ""} ${
    data.selected
      ? "border-primary shadow-lg ring-2 ring-primary-bg-strong"
      : data.onPath
        ? "border-primary-border"
        : "border-border hover:border-primary-border-hover"
  } ${data.dim ? "opacity-25" : ""} ${
    data.variant === "card" ? "py-3 pl-5 pr-4" : `py-2.5 pl-4 ${showToggle && data.direction === "horizontal" ? "pr-5" : "pr-3"}`
  }`;

  const handlers = {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": data.kind === "bucket" ? "UNASSIGNED" : `${data.name}, ${status?.label ?? ""}`,
    "aria-pressed": data.selected,
    onPointerDown: (e: React.PointerEvent) => {
      down.current = { x: e.clientX, y: e.clientY };
    },
    // A drag that pans the canvas can still end over a card; only a click that
    // barely moved counts as choosing it.
    onClick: (e: React.MouseEvent) => {
      const start = down.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
      actions.onSelect(data.id);
    },
    onDoubleClick: () => actions.onFocusBranch(data.id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        actions.onSelect(data.id);
      }
    },
  };

  return (
    <div {...handlers} className={frame}>
      <Handle type="target" position={targetPosition ?? Position.Left} isConnectable={false} className="!h-0 !w-0 !border-0 !opacity-0" />
      <Handle type="source" position={sourcePosition ?? Position.Right} isConnectable={false} className="!h-0 !w-0 !border-0 !opacity-0" />

      {data.kind === "bucket" ? (
        <div className="my-auto">
          <p className="text-sm font-bold tracking-widest text-foreground">UNASSIGNED</p>
          <p className="text-xs text-muted">{data.downline} thành viên chưa có Leader</p>
        </div>
      ) : low ? (
        <div className="my-auto">
          <p className="line-clamp-2 text-lg font-bold leading-tight text-foreground">{data.name}</p>
          {data.variant !== "member" && data.stats && <p className="text-sm tabular-nums text-muted">{data.stats.total}</p>}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <InitialsAvatar name={data.name} size={30} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold tracking-wide text-foreground" title={data.name}>
                {data.name}
              </p>
              <p className="font-mono text-[11px] text-muted">{idLabel(data.igniteId)}</p>
            </div>
            {data.actions && (
              <button
                type="button"
                aria-label={`Thao tác với ${data.name}`}
                className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-faint-bg hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onMenu(data.id, e.currentTarget.getBoundingClientRect());
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>

          {data.status && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <StatusPill status={data.status} />
              <span className="truncate text-[11.5px] text-muted">
                {data.branch}
                {data.team ? ` · ${data.team}` : ""}
              </span>
            </div>
          )}

          {data.variant === "member" && <p className="mt-1 text-[11.5px] tabular-nums text-faint">{data.downline} downline</p>}

          {data.variant === "branch" && data.stats && (
            <>
              <StatusBar stats={data.stats} />
              <p className="mt-1 text-[11.5px] tabular-nums text-muted">{data.stats.total} thành viên</p>
            </>
          )}

          {data.variant === "card" && data.stats && (
            <>
              <p className="mt-2 text-xs text-muted">
                <strong className="mr-1 text-2xl font-bold tabular-nums text-foreground">{data.stats.total}</strong>thành viên
              </p>
              <StatusBar stats={data.stats} />
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted">
                {NETWORK_STATUS_ORDER.map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${NETWORK_STATUS_CONFIG[s].dot}`} />
                    {data.stats![s]} {NETWORK_STATUS_CONFIG[s].label}
                  </span>
                ))}
              </p>
            </>
          )}
        </>
      )}

      {showToggle && (
        <button
          type="button"
          aria-label={data.folded ? `Mở nhánh (${data.downline} người)` : "Gập nhánh"}
          className={`nodrag nopan absolute z-10 flex h-6 min-w-6 items-center justify-center rounded-full border border-border-strong bg-background px-1.5 text-[11px] font-bold tabular-nums text-primary hover:bg-primary hover:text-primary-foreground ${
            data.direction === "horizontal" ? "-right-3.5 top-1/2 -translate-y-1/2" : "-bottom-3.5 left-1/2 -translate-x-1/2"
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            actions.onToggle(data.id);
          }}
        >
          {toggleLabel}
        </button>
      )}
    </div>
  );
}

export type TreeEdgeData = {
  /** Referral edges are dashed so the two trees never read as the same thing. */
  dashed: boolean;
  /** On the path from the root to the selected member. */
  hot: boolean;
  dim: boolean;
  [key: string]: unknown;
};

export function TreeEdgeView({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const d = data as TreeEdgeData | undefined;
  return (
    <BaseEdge
      path={path}
      style={{
        stroke: d?.hot ? "var(--primary)" : "var(--faint)",
        strokeWidth: d?.hot ? 2.6 : 1.6,
        strokeDasharray: d?.dashed && !d.hot ? "7 6" : undefined,
        opacity: d?.dim ? 0.25 : 1,
        fill: "none",
      }}
    />
  );
}
