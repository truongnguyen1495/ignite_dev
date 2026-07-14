import { Plus, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { BookPageData } from "@/lib/library-book-elements";
import { BookPageThumbnail } from "@/components/library/book-page-thumbnail";

const THUMB_WIDTH = 96;

function Thumbnail({ page, bookWidth, bookHeight }: { page: BookPageData; bookWidth: number; bookHeight: number }) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <BookPageThumbnail page={page} bookWidth={bookWidth} bookHeight={bookHeight} width={THUMB_WIDTH} />
    </div>
  );
}

export function PageThumbnailRail({
  pages,
  bookWidth,
  bookHeight,
  selectedIndex,
  onSelect,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
}: {
  pages: BookPageData[];
  bookWidth: number;
  bookHeight: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-3">
      <button
        type="button"
        onClick={onAddPage}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm trang
      </button>

      {pages.map((page, index) => (
        <div
          key={index}
          className={`space-y-1 rounded-lg p-1.5 ${
            index === selectedIndex ? "bg-primary/10 ring-1 ring-primary" : ""
          }`}
        >
          <button type="button" onClick={() => onSelect(index)} className="mx-auto block">
            <Thumbnail page={page} bookWidth={bookWidth} bookHeight={bookHeight} />
          </button>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted">Trang {index + 1}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMovePage(index, -1)}
                disabled={index === 0}
                className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                aria-label="Lên"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onMovePage(index, 1)}
                disabled={index === pages.length - 1}
                className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
                aria-label="Xuống"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicatePage(index)}
                className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Nhân bản"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDeletePage(index)}
                disabled={pages.length <= 1}
                className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-30"
                aria-label="Xóa"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
