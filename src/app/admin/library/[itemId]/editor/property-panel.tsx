"use client";

import { useRef, useState } from "react";
import { Trash2, Copy, ArrowUpToLine, ArrowDownToLine, Upload, Loader2 } from "lucide-react";
import type { BookElement, BookPageData } from "@/lib/library-book-elements";
import { parseYoutubeId } from "@/lib/youtube";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./rich-text-editor";

// A bare native <input type="file"> renders as the browser's own tiny
// "Choose File / No file chosen" widget — easy to miss entirely next to
// this panel's other proper buttons (an admin testing the editor didn't
// spot it as the upload control at all). Hides the native input and
// triggers it from a normal styled Button instead, matching the upload
// buttons everywhere else in this app (LibraryFileInput, CoverImageInput).
function UploadButton({
  accept,
  disabled,
  label,
  onFile,
}: {
  accept: string;
  disabled?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {disabled ? "Đang tải..." : label}
      </Button>
    </>
  );
}

async function uploadFile(url: string, file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", body: formData });
  const json = await res.json();
  return res.ok ? json.url : null;
}

// Video specifically needs a surfaced error message (unlike the plain
// uploadFile above) since a too-large file trips Vercel's own platform body
// limit before this route runs — that comes back as a plain-text 413 body,
// and res.json() on it throws its own confusing parse error instead of the
// real "file too large" message. Same lesson as library-file-input.tsx.
async function uploadVideoFile(file: File): Promise<{ url: string | null; error: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload-book-video", { method: "POST", body: formData });
  if (!res.ok) {
    if (res.status === 413) {
      return { url: null, error: "File quá lớn so với giới hạn upload của server. Video dài nên dùng link YouTube thay vì tải trực tiếp." };
    }
    try {
      const json = await res.json();
      return { url: null, error: json.error || "Tải video lên thất bại." };
    } catch {
      return { url: null, error: "Tải video lên thất bại." };
    }
  }
  const json = await res.json();
  return { url: json.url, error: null };
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
  onDuplicateElement,
  onMoveElementLayer,
  onUpdatePageBackground,
  onApplyBackgroundToAllPages,
}: {
  page: BookPageData;
  selectedElement: BookElement | null;
  onUpdateElement: (patch: Partial<BookElement>) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onMoveElementLayer: (direction: "front" | "back") => void;
  onUpdatePageBackground: (patch: Partial<BookPageData>) => void;
  onApplyBackgroundToAllPages: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
          <UploadButton
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            label="Tải ảnh nền lên"
            onFile={async (file) => {
              setUploading(true);
              const url = await uploadFile("/api/admin/upload-image", file);
              setUploading(false);
              if (url) onUpdatePageBackground({ backgroundImageUrl: url });
            }}
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveElementLayer("back")}
            className="text-muted hover:text-foreground"
            title="Đưa xuống dưới"
            aria-label="Đưa xuống dưới"
          >
            <ArrowDownToLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveElementLayer("front")}
            className="text-muted hover:text-foreground"
            title="Đưa lên trên"
            aria-label="Đưa lên trên"
          >
            <ArrowUpToLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicateElement}
            className="text-muted hover:text-foreground"
            title="Nhân bản (Ctrl+D)"
            aria-label="Nhân bản phần tử"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDeleteElement}
            className="text-danger hover:text-danger/80"
            title="Xóa (phím Delete)"
            aria-label="Xóa phần tử"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedElement.type === "text" && (
        <>
          <div className="space-y-1">
            <span className="text-sm text-foreground">Nội dung</span>
            <RichTextEditor
              key={selectedElement.id}
              content={selectedElement.content}
              onChange={(content) => onUpdateElement({ content })}
            />
          </div>
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
          <div className="flex gap-2">
            {(["left", "center", "right", "justify"] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => onUpdateElement({ align })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                  selectedElement.align === align ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
                }`}
              >
                {align === "left" ? "Trái" : align === "center" ? "Giữa" : align === "right" ? "Phải" : "Đều 2 bên"}
              </button>
            ))}
          </div>
        </>
      )}

      {selectedElement.type === "image" && (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Ảnh</span>
            <UploadButton
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              label="Tải ảnh lên"
              onFile={async (file) => {
                setUploading(true);
                const url = await uploadFile("/api/admin/upload-image", file);
                setUploading(false);
                if (url) onUpdateElement({ url });
              }}
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
                  selectedElement.kind === kind ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
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
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Video (MP4/WebM/OGG, tối đa ~4MB)</span>
            <UploadButton
              accept="video/mp4,video/webm,video/ogg"
              disabled={uploading}
              label="Tải video lên"
              onFile={async (file) => {
                setUploading(true);
                setUploadError(null);
                const result = await uploadVideoFile(file);
                setUploading(false);
                if (result.url) onUpdateElement({ url: result.url });
                else setUploadError(result.error);
              }}
            />
          </label>
          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
          {selectedElement.url && (
            <div className="flex items-center justify-between gap-2">
              <video controls className="max-h-32 w-full rounded border border-border" src={selectedElement.url} />
              <button
                type="button"
                onClick={() => onUpdateElement({ url: "" })}
                className="shrink-0 text-xs text-danger hover:underline"
              >
                Xóa video
              </button>
            </div>
          )}
          <Input
            id="video-url"
            label="Hoặc link YouTube"
            defaultValue={selectedElement.youtubeId}
            placeholder="https://youtube.com/watch?v=..."
            hint={selectedElement.url ? "Đang ưu tiên phát video đã tải lên ở trên, bỏ qua link này." : undefined}
            onChange={(e) => onUpdateElement({ youtubeId: parseYoutubeId(e.target.value) ?? "" })}
          />
        </>
      )}

      {selectedElement.type === "audio" && (
        <label className="block space-y-1 text-sm">
          <span className="text-foreground">File audio</span>
          <UploadButton
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/mp4"
            disabled={uploading}
            label="Tải audio lên"
            onFile={async (file) => {
              setUploading(true);
              const url = await uploadFile("/api/admin/upload-book-audio", file);
              setUploading(false);
              if (url) onUpdateElement({ url });
            }}
          />
          {selectedElement.url && <audio controls src={selectedElement.url} className="w-full" />}
        </label>
      )}
    </div>
  );
}
