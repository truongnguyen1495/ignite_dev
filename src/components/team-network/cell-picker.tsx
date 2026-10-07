"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { NETWORK_STATUS_CONFIG } from "@/lib/network-status";
import { compareNames, foldName, matchesSearch, type NetworkMemberLite } from "@/lib/network-tree";
import { idLabel } from "./network-ui";

const MAX_RESULTS = 40;
const POPOVER_HEIGHT = 300;
const NOBODY: ReadonlySet<string> = new Set();

// Picks one member from inside a table cell. The list is drawn with position: fixed at
// the trigger instead of inside the cell, because the table scrolls and would clip a
// dropdown that lived in it. Whoever must not be offered (the person themself and
// everyone below them, which would close a loop) is left out of the list, worked out
// when it opens rather than for every row on every render.
export function CellPicker({
  members,
  value,
  noneLabel,
  excluded,
  note,
  allowNone = true,
  onPick,
  trigger,
  ariaLabel,
  className = "max-w-full",
}: {
  members: readonly NetworkMemberLite[];
  value: string | null;
  noneLabel: string;
  excluded?: () => ReadonlySet<string>;
  note?: string;
  /** False when "nobody" is not a valid answer (assigning a leader to several people). */
  allowNone?: boolean;
  onPick: (id: string | null) => void;
  /** What the button shows. */
  trigger: ReactNode;
  ariaLabel: string;
  /** Sizing for the button. Carries the max width, so there is exactly one max-w class on it. */
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [omit, setOmit] = useState<ReadonlySet<string>>(NOBODY);
  const [query, setQuery] = useState("");
  // -1 = nothing highlighted yet: Enter on a freshly opened list must not pick "nobody".
  const [active, setActive] = useState(-1);

  const open = anchor !== null;

  function openList() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOmit(excluded?.() ?? NOBODY);
    setQuery("");
    setActive(-1);
    setAnchor(rect);
  }

  function close(returnFocus = false) {
    setAnchor(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Sorted once per opening; typing only filters this.
  const candidates = useMemo(
    () => (open ? members.filter((m) => !omit.has(m.id)).sort((a, b) => compareNames(a.name, b.name)) : []),
    [open, members, omit]
  );
  const matches = useMemo(() => {
    const q = foldName(query);
    return q ? candidates.filter((m) => matchesSearch(m, q)) : candidates;
  }, [candidates, query]);
  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches]);
  // Row 0 is "nobody" (when allowed); the people follow.
  const rows: (NetworkMemberLite | null)[] = allowNone ? [null, ...results] : results;

  // Focus the search box without letting the browser scroll the table to reveal it: that
  // scroll would arrive at the listener below and close the list the moment it opened.
  useEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) setAnchor(null);
    };
    // The list hangs from the trigger, so when the table scrolls under it the list follows
    // (a scroll that did not move the trigger changes nothing). Scrolling inside the list
    // itself is not the table moving.
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Scrolled out of sight: the list would be left floating over something else.
      if (rect.bottom < 0 || rect.top > window.innerHeight) setAnchor(null);
      else setAnchor(rect);
    };
    const onResize = () => setAnchor(null);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function pick(member: NetworkMemberLite | null) {
    close(true);
    onPick(member?.id ?? null);
  }

  // Moves the highlight with the arrow keys and scrolls the list just enough to keep it in
  // sight (the list shows about six rows, the highlight can run past them). Done here and not
  // in an effect, so the mouse hovering a half-hidden row does not make the list jump.
  function moveTo(next: number) {
    setActive(next);
    const list = listRef.current;
    const row = list?.children[next] as HTMLElement | undefined;
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      // Focus is on its way to the next control; the list must not stay open behind it.
      window.setTimeout(() => setAnchor(null), 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(Math.min(active + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < rows.length) pick(rows[active]);
    }
  }

  // Place the list under the trigger, or above it when there is no room below.
  const style = (() => {
    if (!anchor) return undefined;
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 328));
    const roomBelow = window.innerHeight - anchor.bottom;
    return roomBelow < POPOVER_HEIGHT && anchor.top > roomBelow
      ? { left, bottom: window.innerHeight - anchor.top + 4 }
      : { left, top: anchor.bottom + 4 };
  })();

  return (
    <span ref={rootRef} className="inline-flex min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border border-dashed border-transparent px-1.5 py-0.5 text-left hover:border-border-strong hover:bg-faint-bg ${className}`}
      >
        {trigger}
        <span aria-hidden="true" className="text-[10px] text-faint">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={popRef}
          style={style}
          onKeyDown={onKeyDown}
          className="fixed z-[55] w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-primary-border bg-surface shadow-xl"
        >
          <div className="relative border-b border-border p-2">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Typing narrows the list to people: highlight the first of them, not the "nobody" row,
                // so type-then-Enter picks the person that was typed for.
                setActive(allowNone ? 1 : 0);
              }}
              placeholder="Tìm tên hoặc RapidX ID…"
              aria-label="Tìm thành viên"
              aria-controls={listId}
              autoComplete="off"
              className="w-full rounded-lg border border-border-strong bg-background py-1.5 pl-8 pr-2 text-base text-foreground placeholder:text-faint focus:border-primary focus:outline-none sm:text-sm"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="relative max-h-60 overflow-y-auto p-1">
            {rows.map((m, i) => {
              const selected = (m?.id ?? null) === value;
              return (
                <li key={m?.id ?? "nobody"} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => pick(m)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${i === active ? "bg-surface-hover" : ""} ${
                      selected ? "font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    {m ? (
                      <>
                        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${NETWORK_STATUS_CONFIG[m.status].dot}`} />
                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">{idLabel(m.igniteId)}</span>
                      </>
                    ) : (
                      <span className="text-muted">{noneLabel}</span>
                    )}
                  </button>
                </li>
              );
            })}
            {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">Không có ai khớp.</li>}
          </ul>
          {matches.length > MAX_RESULTS && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted">
              Đang hiện {MAX_RESULTS} trong {matches.length} người. Gõ tên hoặc RapidX ID để tìm đúng người.
            </p>
          )}
          {note && <p className="border-t border-border px-3 py-2 text-xs text-muted">{note}</p>}
        </div>
      )}
    </span>
  );
}
