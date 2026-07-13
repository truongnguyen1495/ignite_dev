"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const currentPage = pages[selectedPageIndex];
  const selectedElement = currentPage?.elements.find((el) => el.id === selectedElementId) ?? null;

  function mutateCurrentPage(patch: Partial<BookPageData>) {
    setPages((prev) => prev.map((p, i) => (i === selectedPageIndex ? { ...p, ...patch } : p)));
    setIsDirty(true);
  }

  function updateElement(elementId: string, patch: Partial<BookElement>) {
    mutateCurrentPage({
      elements: currentPage.elements.map((el) => (el.id === elementId ? ({ ...el, ...patch } as BookElement) : el)),
    });
  }

  function deleteElement(elementId: string) {
    mutateCurrentPage({ elements: currentPage.elements.filter((el) => el.id !== elementId) });
    if (selectedElementId === elementId) setSelectedElementId(null);
  }

  function addElement(type: BookElementType) {
    const element = createDefaultElement(type, crypto.randomUUID());
    mutateCurrentPage({ elements: [...currentPage.elements, element] });
    setSelectedElementId(element.id);
  }

  function addPage() {
    setPages((prev) => [...prev, emptyPage()]);
    setSelectedPageIndex(pages.length);
    setSelectedElementId(null);
    setIsDirty(true);
  }

  function duplicatePage(index: number) {
    setPages((prev) => {
      const copy = structuredClone(prev[index]);
      copy.elements = copy.elements.map((el) => ({ ...el, id: crypto.randomUUID() }));
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSelectedPageIndex(index + 1);
    setSelectedElementId(null);
    setIsDirty(true);
  }

  function deletePage(index: number) {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
    setSelectedPageIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setSelectedElementId(null);
    setIsDirty(true);
  }

  function movePage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedPageIndex(target);
    setIsDirty(true);
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
            setSelectedElementId(null);
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
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={updateElement}
            />
          )}
        </div>
        <PropertyPanel
          page={currentPage}
          selectedElement={selectedElement}
          onUpdateElement={(patch) => selectedElementId && updateElement(selectedElementId, patch)}
          onDeleteElement={() => selectedElementId && deleteElement(selectedElementId)}
          onUpdatePageBackground={(patch) => mutateCurrentPage(patch)}
          onApplyBackgroundToAllPages={() => {
            setPages((prev) =>
              prev.map((p) => ({
                ...p,
                backgroundColor: currentPage.backgroundColor,
                backgroundImageUrl: currentPage.backgroundImageUrl,
              }))
            );
            setIsDirty(true);
          }}
        />
      </div>
    </div>
  );
}
