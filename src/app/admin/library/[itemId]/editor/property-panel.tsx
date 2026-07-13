"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { BookElement, BookPageData } from "@/lib/library-book-elements";
import { parseYoutubeId } from "@/lib/youtube";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

async function uploadFile(url: string, file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", body: formData });
  const json = await res.json();
  return res.ok ? json.url : null;
}

// Contextual right panel: page background controls when nothing is
// selected, or the selected element's type-specific fields. `key` on the
// per-type fields wrapper forces a remount on selection change so
// defaultValue-based inputs always reflect the newly selected element
// instead of showing stale text from the previous one.
export function PropertyPanel({
  page,
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onUpdatePageBackground,
  onApplyBackgroundToAllPages,
}: {
  page: BookPageData;
  selectedElement: BookElement | null;
  onUpdateElement: (patch: Partial<BookElement>) => void;
  onDeleteElement: () => void;
  onUpdatePageBackground: (patch: Partial<BookPageData>) => void;
  onApplyBackgroundToAllPages: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  if (!selectedElement) {
    return (
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Nền trang</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-foreground">Màu nền</span>
          <input
            type="color"
            value={page.backgroundColor ?? "#ffffff"}
            onChange={(e) => onUpdatePageBackground({ backgroundColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded border border-border"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-foreground">Ảnh nền (tùy chọn)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              const url = await uploadFile("/api/admin/upload-image", file);
              setUploading(false);
              if (url) onUpdatePageBackground({ backgroundImageUrl: url });
            }}
            className="block w-full text-xs"
          />
          {page.backgroundImageUrl && (
            <button
              type="button"
              onClick={() => onUpdatePageBackground({ backgroundImageUrl: null })}
              className="text-xs text-danger hover:underline"
            >
              Xóa ảnh nền
            </button>
          )}
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={onApplyBackgroundToAllPages}>
          Áp dụng cho mọi trang
        </Button>
      </div>
    );
  }

  return (
    <div key={selectedElement.id} className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Thuộc tính</h2>
        <button
          type="button"
          onClick={onDeleteElement}
          className="text-danger hover:text-danger/80"
          aria-label="Xóa phần tử"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {selectedElement.type === "text" && (
        <>
          <Textarea
            id="text-content"
            label="Nội dung"
            rows={3}
            defaultValue={selectedElement.content}
            onChange={(e) => onUpdateElement({ content: e.target.value })}
          />
          <Input
            id="text-fontsize"
            type="number"
            label="Cỡ chữ"
            defaultValue={selectedElement.fontSize}
            onChange={(e) => onUpdateElement({ fontSize: Number(e.target.value) || 16 })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu chữ</span>
            <input
              type="color"
              value={selectedElement.color}
              onChange={(e) => onUpdateElement({ color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-border"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={selectedElement.bold}
              onChange={(e) => onUpdateElement({ bold: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            In đậm
          </label>
          <div className="flex gap-2">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => onUpdateElement({ align })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                  selectedElement.align === align ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
                }`}
              >
                {align === "left" ? "Trái" : align === "center" ? "Giữa" : "Phải"}
              </button>
            ))}
          </div>
        </>
      )}

      {selectedElement.type === "image" && (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Ảnh</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                const url = await uploadFile("/api/admin/upload-image", file);
                setUploading(false);
                if (url) onUpdateElement({ url });
              }}
              className="block w-full text-xs"
            />
          </label>
          {selectedElement.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedElement.url} alt="" className="max-h-32 w-full rounded border border-border object-contain" />
          )}
          <Input
            id="image-alt"
            label="Mô tả ảnh (alt, tùy chọn)"
            defaultValue={selectedElement.alt ?? ""}
            onChange={(e) => onUpdateElement({ alt: e.target.value })}
          />
        </>
      )}

      {selectedElement.type === "shape" && (
        <>
          <div className="flex gap-2">
            {(["rectangle", "ellipse"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onUpdateElement({ kind })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                  selectedElement.kind === kind ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
                }`}
              >
                {kind === "rectangle" ? "Chữ nhật" : "Hình tròn/oval"}
              </button>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu</span>
            <input
              type="color"
              value={selectedElement.fill}
              onChange={(e) => onUpdateElement({ fill: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-border"
            />
          </label>
          {selectedElement.kind === "rectangle" && (
            <Input
              id="shape-radius"
              type="number"
              label="Bo góc (px)"
              defaultValue={selectedElement.borderRadius}
              onChange={(e) => onUpdateElement({ borderRadius: Number(e.target.value) || 0 })}
            />
          )}
        </>
      )}

      {selectedElement.type === "button" && (
        <>
          <Input
            id="button-label"
            label="Nhãn nút"
            defaultValue={selectedElement.label}
            onChange={(e) => onUpdateElement({ label: e.target.value })}
          />
          <Input
            id="button-href"
            label="Liên kết (URL)"
            defaultValue={selectedElement.href}
            onChange={(e) => onUpdateElement({ href: e.target.value })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu nền</span>
            <input
              type="color"
              value={selectedElement.bgColor}
              onChange={(e) => onUpdateElement({ bgColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-border"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu chữ</span>
            <input
              type="color"
              value={selectedElement.textColor}
              onChange={(e) => onUpdateElement({ textColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-border"
            />
          </label>
        </>
      )}

      {selectedElement.type === "video" && (
        <Input
          id="video-url"
          label="Link YouTube"
          defaultValue={selectedElement.youtubeId}
          placeholder="https://youtube.com/watch?v=..."
          onChange={(e) => onUpdateElement({ youtubeId: parseYoutubeId(e.target.value) ?? "" })}
        />
      )}

      {selectedElement.type === "audio" && (
        <label className="block space-y-1 text-sm">
          <span className="text-foreground">File audio</span>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/mp4"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              const url = await uploadFile("/api/admin/upload-book-audio", file);
              setUploading(false);
              if (url) onUpdateElement({ url });
            }}
            className="block w-full text-xs"
          />
          {selectedElement.url && <audio controls src={selectedElement.url} className="w-full" />}
        </label>
      )}
    </div>
  );
}
