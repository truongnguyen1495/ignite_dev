"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Editor } from "@tiptap/react";
import { Pencil, X } from "lucide-react";

const HIDE_DELAY_MS = 250;

type HoveredLink = {
  element: HTMLAnchorElement;
  href: string;
  top: number;
  left: number;
  bottom: number;
};

// Hover-triggered edit affordance for links already inserted in the editor.
// Needed because the Link extension now uses openOnClick: true (clicking a
// link opens it in a new tab), so clicking into the link text can no longer
// double as "start editing it" the way clicking a plain node normally would
// in Tiptap — this component is the replacement entry point for editing an
// existing link's URL, triggered by mouse proximity instead of a click.
export function LinkHoverMenu({ editor }: { editor: Editor | null }) {
  const [hovered, setHovered] = useState<HoveredLink | null>(null);
  const [editing, setEditing] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function cancelHide() {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }

  function scheduleHide() {
    cancelHide();
    hideTimeoutRef.current = setTimeout(() => {
      setHovered(null);
      setEditing(false);
    }, HIDE_DELAY_MS);
  }

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link || !dom.contains(link)) return;
      cancelHide();
      const containerRect = dom.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      setHovered({
        element: link,
        href: link.getAttribute("href") ?? "",
        top: linkRect.top - containerRect.top,
        left: linkRect.left - containerRect.left,
        bottom: linkRect.bottom - containerRect.top,
      });
    }

    function handleMouseOut(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;
      scheduleHide();
    }

    dom.addEventListener("mouseover", handleMouseOver);
    dom.addEventListener("mouseout", handleMouseOut);
    return () => {
      dom.removeEventListener("mouseover", handleMouseOver);
      dom.removeEventListener("mouseout", handleMouseOut);
      cancelHide();
    };
  }, [editor]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!editor || !hovered) return null;

  function openEditForm() {
    if (!hovered) return;
    setUrlValue(hovered.href);
    setEditing(true);
  }

  function commitEdit() {
    if (!editor || !hovered) return;
    const from = editor.view.posAtDOM(hovered.element, 0);
    const to = editor.view.posAtDOM(hovered.element, hovered.element.childNodes.length);
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .extendMarkRange("link")
      .setLink({ href: urlValue.trim() })
      .run();
    setEditing(false);
    setHovered(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      setHovered(null);
    }
  }

  // Prefer showing the popover above the link, but flip below it when
  // there isn't enough room — a link on the first line of content would
  // otherwise place the button underneath the toolbar's sticky header,
  // where it renders but can't receive clicks (the header sits on top).
  const showAbove = hovered.top > 40;
  const top = showAbove ? hovered.top - 8 : hovered.bottom + 4;

  return (
    <div
      className="absolute z-20"
      style={{ top, left: hovered.left }}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    >
      {editing ? (
        <div
          className={`flex items-center gap-1 rounded-md border border-border bg-surface-hover p-1.5 shadow-lg ${
            showAbove ? "-translate-y-full" : ""
          }`}
        >
          <input
            ref={inputRef}
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            className="w-56 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setHovered(null);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditForm}
          title="Sửa link"
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-md hover:bg-surface-hover hover:text-foreground ${
            showAbove ? "-translate-y-full" : ""
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
