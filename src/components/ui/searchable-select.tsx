"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeForSearch } from "@/lib/address";

export type SearchableOption = { value: string; label: string };

/**
 * A <select> that can be typed into.
 *
 * Exists because the native control can't do the one thing this list needs:
 * 34 provinces is already a long scroll, and a province like Hà Nội has 126
 * wards under it — nobody finds "Phường Nghĩa Đô" in a native dropdown
 * without giving up first. So the trigger opens a panel with a search box,
 * and matching is diacritic-insensitive (see normalizeForSearch), because
 * people type "da nang" on a laptop keyboard, not "Đà Nẵng".
 *
 * Keyboard support is not decoration here — a checkout form is exactly
 * where someone tabs through fields without touching the mouse: ↑/↓ move
 * the highlight, Enter picks it, Esc closes and returns focus to the
 * trigger, and the active option is announced through aria-activedescendant
 * rather than by moving focus into the list (which would take focus away
 * from the search box mid-typing).
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Tìm kiếm…",
  emptyText = "Không tìm thấy — thử gõ ít chữ hơn.",
  disabled = false,
  loading = false,
  error,
}: {
  id: string;
  label: string;
  options: readonly SearchableOption[];
  /** Empty string means "nothing chosen yet". */
  value: string;
  onChange: (value: string) => void;
  /** Shown on the trigger while nothing is chosen. */
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Renders the trigger as busy — used while a province's wards load. */
  loading?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  // Normalized once per list rather than once per keystroke per option:
  // retyping a query over Hà Nội's 126 wards would otherwise re-fold every
  // name on every character.
  const searchable = useMemo(
    () => options.map((option) => ({ option, haystack: normalizeForSearch(option.label) })),
    [options]
  );

  const matches = useMemo(() => {
    const needle = normalizeForSearch(query);
    if (!needle) return options;
    return searchable.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.option);
  }, [options, searchable, query]);

  // Reopening should start from what is already chosen, not from the top of
  // a list the buyer has to scroll through again.
  function openPanel() {
    if (disabled || loading) return;
    setQuery("");
    const current = options.findIndex((option) => option.value === value);
    setActiveIndex(current >= 0 ? current : 0);
    setOpen(true);
  }

  function closePanel({ focusTrigger = false }: { focusTrigger?: boolean } = {}) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function pick(optionValue: string) {
    onChange(optionValue);
    closePanel({ focusTrigger: true });
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  // Typing narrows the list, so whatever was highlighted is probably gone —
  // reset with the keystroke that caused it (see the search input's
  // onChange) rather than in an effect watching `query`, which would be a
  // second render every character.
  function onSearch(next: string) {
    setQuery(next);
    setActiveIndex(0);
  }

  // Keeps the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const active = list?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, matches.length]);

  // Pointerdown, not click: a click that starts inside the panel and ends
  // outside it (a drag on the scrollbar) must not count as "clicked away".
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel({ focusTrigger: true });
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (matches.length === 0 ? 0 : (index + 1) % matches.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (matches.length === 0 ? 0 : (index - 1 + matches.length) % matches.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = matches[activeIndex];
      if (option) pick(option.value);
    } else if (event.key === "Tab") {
      // Tab is a commitment to leave — close rather than leaving an
      // orphaned panel floating over the next field.
      setOpen(false);
    }
  }

  const triggerLabel = loading ? "Đang tải…" : (selected?.label ?? placeholder);
  const showsPlaceholder = !selected || loading;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative" ref={containerRef} onKeyDown={onKeyDown}>
        <button
          type="button"
          id={id}
          ref={triggerRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          disabled={disabled || loading}
          onClick={() => (open ? closePanel() : openPanel())}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-base sm:text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            error ? "border-danger" : "border-border-strong"
          } ${showsPlaceholder ? "text-muted" : "text-foreground"} ${
            open ? "border-primary" : "hover:border-primary-border-hover"
          }`}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-primary-border bg-surface shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={
                  matches[activeIndex] ? `${listId}-${matches[activeIndex].value}` : undefined
                }
                className="w-full bg-transparent text-base sm:text-sm text-foreground placeholder:text-faint focus:outline-none"
              />
            </div>
            <ul
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label={label}
              className="max-h-60 overflow-y-auto p-1"
            >
              {matches.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${option.value}`}
                    role="option"
                    aria-selected={isSelected}
                    onPointerDown={(event) => {
                      // Stops the trigger from losing focus before the click
                      // lands, which would close the panel first and swallow
                      // the selection.
                      event.preventDefault();
                      pick(option.value);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-base sm:text-sm ${
                      index === activeIndex ? "bg-surface-hover" : ""
                    } ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </li>
                );
              })}
              {matches.length === 0 && <li className="px-2.5 py-3 text-xs text-muted">{emptyText}</li>}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
