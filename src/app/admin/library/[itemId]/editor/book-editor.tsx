"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2, Redo2, Trash2, Copy } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { saveLibraryBookPagesAction } from "../../actions";
import type { BookElement, BookElementType, BookPageData } from "@/lib/library-book-elements";
import { createDefaultElement } from "@/lib/library-book-elements";
import { PageThumbnailRail } from "./page-thumbnail-rail";
import { ElementToolbar } from "./element-toolbar";
import { EditorCanvas } from "./editor-canvas";
import { PropertyPanel } from "./property-panel";

function emptyPage(): BookPageData {
  return { backgroundColor: "#ffffff", backgroundImageUrl: null, elements: [] };
}

// Keyboard shortcuts below only fire when focus isn't in a text field —
// otherwise Delete/Ctrl+Z/Ctrl+C etc. would fight the browser's own native
// editing behavior inside the content Textarea or a text/url Input.
function isEditingText(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

const MAX_HISTORY = 50;

export function BookEditor({
  libraryItemId,
  title,
  bookWidth,
  bookHeight,
  initialPages,
}: {
  libraryItemId: string;
  title: string;
  bookWidth: number;
  bookHeight: number;
  initialPages: BookPageData[];
}) {
  const router = useRouter();
  const [pages, setPages] = useState<BookPageData[]>(initialPages.length > 0 ? initialPages : [emptyPage()]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  // Multiple elements can be selected (shift-click or a marquee drag on
  // empty canvas) for group move/delete/duplicate/nudge — but the property
  // panel only ever edits ONE element's fields in detail, so it falls back
  // to a simple "N phần tử đã chọn" summary whenever this has more than one
  // entry (see the JSX below).
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  // Undo/redo history — only page/element *data* is tracked here, never
  // selection state, so undoing doesn't yank focus around unexpectedly.
  // `pagesRef` mirrors `pages` for the keyboard handler below (registered
  // once, so its closure would otherwise see a stale `pages`).
  const pastRef = useRef<BookPageData[][]>([]);
  const futureRef = useRef<BookPageData[][]>([]);
  const pagesRef = useRef(pages);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // One in-memory "clipboard" slot for copy/paste across pages — deliberately
  // not localStorage/navigator.clipboard: this only ever needs to survive
  // within the current editor session, and a plain ref avoids async
  // permission prompts for something this low-stakes.
  const clipboardRef = useRef<BookElement[] | null>(null);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const commitPages = useCallback((updater: (prev: BookPageData[]) => BookPageData[]) => {
    setPages((prev) => {
      const next = updater(prev);
      pastRef.current = [...pastRef.current, prev].slice(-MAX_HISTORY);
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
    setIsDirty(true);
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [...futureRef.current, pagesRef.current];
    setPages(previous);
    setIsDirty(true);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    pastRef.current = [...pastRef.current, pagesRef.current];
    setPages(next);
    setIsDirty(true);
    setCanRedo(futureRef.current.length > 0);
    setCanUndo(true);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const currentPage = pages[selectedPageIndex];
  const selectedElement =
    selectedElementIds.length === 1
      ? (currentPage?.elements.find((el) => el.id === selectedElementIds[0]) ?? null)
      : null;

  function mutateCurrentPage(patch: Partial<BookPageData>) {
    commitPages((prev) => prev.map((p, i) => (i === selectedPageIndex ? { ...p, ...patch } : p)));
  }

  function updateElement(elementId: string, patch: Partial<BookElement>) {
    mutateCurrentPage({
      elements: currentPage.elements.map((el) => (el.id === elementId ? ({ ...el, ...patch } as BookElement) : el)),
    });
  }

  // Applies several elements' patches as a single undo step — used for
  // group nudge/drag so moving 3 selected elements together undoes in one
  // Ctrl+Z, not three.
  function updateElements(patches: { id: string; patch: Partial<BookElement> }[]) {
    const byId = new Map(patches.map((p) => [p.id, p.patch]));
    mutateCurrentPage({
      elements: currentPage.elements.map((el) => {
        const patch = byId.get(el.id);
        return patch ? ({ ...el, ...patch } as BookElement) : el;
      }),
    });
  }

  function deleteSelected() {
    if (selectedElementIds.length === 0) return;
    const ids = new Set(selectedElementIds);
    mutateCurrentPage({ elements: currentPage.elements.filter((el) => !ids.has(el.id)) });
    setSelectedElementIds([]);
  }

  function addElement(type: BookElementType) {
    const element = createDefaultElement(type, crypto.randomUUID());
    mutateCurrentPage({ elements: [...currentPage.elements, element] });
    setSelectedElementIds([element.id]);
  }

  // Places fresh copies (always new ids) of `elements` onto the page at
  // `pageIndex`, nudged slightly so a same-page duplicate/paste doesn't
  // land exactly on top of its source and look like nothing happened.
  function placeElementCopies(elements: BookElement[], pageIndex: number) {
    const copies = elements.map((element) => ({
      ...structuredClone(element),
      id: crypto.randomUUID(),
      x: element.x + 20,
      y: element.y + 20,
    }));
    commitPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, elements: [...p.elements, ...copies] } : p)));
    setSelectedPageIndex(pageIndex);
    setSelectedElementIds(copies.map((c) => c.id));
  }

  function duplicateSelected() {
    const elements = currentPage.elements.filter((el) => selectedElementIds.includes(el.id));
    if (elements.length > 0) placeElementCopies(elements, selectedPageIndex);
  }

  function copySelected() {
    const elements = currentPage.elements.filter((el) => selectedElementIds.includes(el.id));
    if (elements.length > 0) clipboardRef.current = elements;
  }

  function pasteClipboard() {
    if (clipboardRef.current) placeElementCopies(clipboardRef.current, selectedPageIndex);
  }

  // "front"/"back" relative to every other element on the same page —
  // simpler and always correct, unlike a fixed +1/-1 step which can collide
  // with an existing zIndex already at that value. Only meaningful for a
  // single selected element (the property panel that exposes this button
  // only shows for a single selection anyway).
  function moveElementLayer(elementId: string, direction: "front" | "back") {
    const others = currentPage.elements.filter((el) => el.id !== elementId).map((el) => el.zIndex);
    const target =
      direction === "front" ? (others.length ? Math.max(...others) + 1 : 1) : others.length ? Math.min(...others) - 1 : -1;
    updateElement(elementId, { zIndex: target });
  }

  function nudgeSelected(dx: number, dy: number) {
    const patches = currentPage.elements
      .filter((el) => selectedElementIds.includes(el.id))
      .map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } }));
    if (patches.length > 0) updateElements(patches);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditingText(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (selectedElementIds.length === 0) return;

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, step);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(step, 0);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementIds, currentPage]);

  function addPage() {
    commitPages((prev) => [...prev, emptyPage()]);
    setSelectedPageIndex(pages.length);
    setSelectedElementIds([]);
  }

  function duplicatePage(index: number) {
    commitPages((prev) => {
      const copy = structuredClone(prev[index]);
      copy.elements = copy.elements.map((el) => ({ ...el, id: crypto.randomUUID() }));
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSelectedPageIndex(index + 1);
    setSelectedElementIds([]);
  }

  function deletePage(index: number) {
    if (pages.length <= 1) return;
    commitPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedPageIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setSelectedElementIds([]);
  }

  function movePage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    commitPages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedPageIndex(target);
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveLibraryBookPagesAction(libraryItemId, pages);
      if (result) {
        setError(result);
        return;
      }
      setIsDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <BackLink href={`/admin/library/${libraryItemId}`}>Quay lại</BackLink>
          <h1 className="mt-1 text-lg font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Hoàn tác (Ctrl+Z)"
              aria-label="Hoàn tác"
              className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Làm lại (Ctrl+Shift+Z)"
              aria-label="Làm lại"
              className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !isDirty}
            variant={isDirty ? "primary" : "secondary"}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Đang lưu..." : isDirty ? "Lưu" : "Đã lưu"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <ElementToolbar onAdd={addElement} />
        <PageThumbnailRail
          pages={pages}
          bookWidth={bookWidth}
          bookHeight={bookHeight}
          selectedIndex={selectedPageIndex}
          onSelect={(i) => {
            setSelectedPageIndex(i);
            setSelectedElementIds([]);
          }}
          onAddPage={addPage}
          onDuplicatePage={duplicatePage}
          onDeletePage={deletePage}
          onMovePage={movePage}
        />
        <div className="flex flex-1 items-center justify-center overflow-auto bg-faint-bg p-8">
          {currentPage && (
            <EditorCanvas
              page={currentPage}
              bookWidth={bookWidth}
              bookHeight={bookHeight}
              selectedElementIds={selectedElementIds}
              onSelectElementIds={setSelectedElementIds}
              onUpdateElement={updateElement}
              onUpdateElements={updateElements}
            />
          )}
        </div>
        {selectedElementIds.length > 1 ? (
          <div className="w-72 shrink-0 space-y-3 border-l border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">{selectedElementIds.length} phần tử đã chọn</h2>
            <p className="text-xs text-muted">
              Kéo bất kỳ phần tử nào trong nhóm để di chuyển cả nhóm. Phím mũi tên/Delete cũng áp dụng cho cả nhóm.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={duplicateSelected}>
                <Copy className="h-3.5 w-3.5" />
                Nhân bản
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-3.5 w-3.5" />
                Xóa
              </Button>
            </div>
          </div>
        ) : (
          <PropertyPanel
            page={currentPage}
            selectedElement={selectedElement}
            onUpdateElement={(patch) => selectedElement && updateElement(selectedElement.id, patch)}
            onDeleteElement={deleteSelected}
            onDuplicateElement={duplicateSelected}
            onMoveElementLayer={(direction) => selectedElement && moveElementLayer(selectedElement.id, direction)}
            onUpdatePageBackground={(patch) => mutateCurrentPage(patch)}
            onApplyBackgroundToAllPages={() => {
              commitPages((prev) =>
                prev.map((p) => ({
                  ...p,
                  backgroundColor: currentPage.backgroundColor,
                  backgroundImageUrl: currentPage.backgroundImageUrl,
                }))
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
