"use client";

import { useRef, useState, type ReactNode } from "react";
import { PAGE_SIZES, pageCount, visiblePages } from "@/lib/network-table";

// A table cell that turns into a text box when clicked. Enter or leaving the box saves,
// Esc cancels. A value the rules reject stays in the box with the reason underneath
// instead of being thrown away; saving is the parent's business (`onCommit`), so the
// optimistic update and the rollback live in one place.
export function EditableText({
  value,
  display,
  ariaLabel,
  mono = false,
  listId,
  validate,
  onCommit,
}: {
  /** The raw value, "" when empty. */
  value: string;
  /** How it reads when not being edited. */
  display: ReactNode;
  ariaLabel: string;
  mono?: boolean;
  /** Name of a <datalist> to suggest from. */
  listId?: string;
  /** The reason a trimmed value is not acceptable, or null. */
  validate: (next: string) => string | null;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  // Enter saves and then the box unmounts and blurs: that second "save" must not run.
  const settled = useRef(false);

  function start() {
    settled.current = false;
    setText(value);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    settled.current = true;
    setEditing(false);
    setError(null);
  }

  function commit() {
    if (settled.current) return;
    const next = text.trim();
    if (next === value.trim()) return cancel();
    const problem = validate(next);
    if (problem) return setError(problem);
    settled.current = true;
    setEditing(false);
    onCommit(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label={`Sửa ${ariaLabel}`}
        title={`Bấm để sửa ${ariaLabel}`}
        className={`min-w-0 max-w-full truncate rounded-md border border-dashed border-transparent px-1.5 py-0.5 text-left hover:border-border-strong hover:bg-faint-bg ${mono ? "font-mono text-xs" : ""}`}
      >
        {display}
      </button>
    );
  }

  return (
    <div className="min-w-[10rem]">
      <input
        autoFocus
        value={text}
        list={listId}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={commit}
        className={`w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground focus:outline-none ${
          error ? "border-danger" : "border-primary"
        } ${mono ? "font-mono text-xs" : ""}`}
      />
      {error && (
        <p role="alert" className="mt-1 max-w-[16rem] whitespace-normal text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Pager({
  total,
  page,
  size,
  onPage,
  onSize,
}: {
  total: number;
  page: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const pages = pageCount(total, size);
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const step = "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm tabular-nums";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2 text-sm text-muted">
      <span>{total === 0 ? "Không có dòng nào" : `Hiển thị ${from}–${to} trên ${total}`}</span>
      <label className="ml-auto flex items-center gap-2">
        Mỗi trang
        <select
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="Phân trang" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={`${step} border-transparent hover:bg-faint-bg disabled:cursor-default disabled:opacity-35`}
        >
          ‹
        </button>
        {visiblePages(page, pages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-faint">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPage(n)}
              className={`${step} ${n === page ? "border-primary-border bg-primary-bg font-semibold text-primary" : "border-transparent hover:bg-faint-bg"}`}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className={`${step} border-transparent hover:bg-faint-bg disabled:cursor-default disabled:opacity-35`}
        >
          ›
        </button>
      </nav>
    </div>
  );
}
