"use client";

import { useRef, useState } from "react";
import { Trash2, Copy, ArrowUpToLine, ArrowDownToLine, Upload, Loader2, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import type { TextAlign, WhiteboardElement } from "@/lib/whiteboard-elements";
import { parseYoutubeId } from "@/lib/youtube";
import { uploadWhiteboardFile, domainOfUrl } from "@/lib/whiteboard-client-utils";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

// Same "hidden native input, styled trigger Button" trick as the book
// editor's property panel (src/app/admin/library/[itemId]/editor/property-panel.tsx).
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
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {disabled ? "Đang tải..." : label}
      </Button>
    </>
  );
}

export function PropertyPanel({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElementLayer,
}: {
  selectedElement: WhiteboardElement | null;
  onUpdateElement: (patch: Partial<WhiteboardElement>) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onMoveElementLayer: (direction: "front" | "back") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!selectedElement) {
    return null;
  }

  return (
    <div key={selectedElement.id} className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Thuộc tính</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMoveElementLayer("back")} className="text-muted hover:text-foreground" title="Đưa xuống dưới" aria-label="Đưa xuống dưới">
            <ArrowDownToLine className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMoveElementLayer("front")} className="text-muted hover:text-foreground" title="Đưa lên trên" aria-label="Đưa lên trên">
            <ArrowUpToLine className="h-4 w-4" />
          </button>
          {selectedElement.type !== "connector" && (
            <button type="button" onClick={onDuplicateElement} className="text-muted hover:text-foreground" title="Nhân bản (Ctrl+D)" aria-label="Nhân bản phần tử">
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onDeleteElement} className="text-danger hover:text-danger/80" title="Xóa (phím Delete)" aria-label="Xóa phần tử">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedElement.type === "sticky" && (
        <>
          <Textarea
            id="sticky-content"
            label="Nội dung"
            rows={4}
            defaultValue={selectedElement.content}
            onChange={(e) => onUpdateElement({ content: e.target.value })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu nền</span>
            <input type="color" value={selectedElement.bgColor} onChange={(e) => onUpdateElement({ bgColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu chữ</span>
            <input type="color" value={selectedElement.textColor} onChange={(e) => onUpdateElement({ textColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <Input
            id="sticky-fontsize"
            type="number"
            label="Cỡ chữ (px)"
            disabled={selectedElement.autoFontSize}
            defaultValue={selectedElement.fontSize}
            onChange={(e) => onUpdateElement({ fontSize: Number(e.target.value) || 16 })}
          />
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={selectedElement.autoFontSize}
              onChange={(e) => onUpdateElement({ autoFontSize: e.target.checked })}
              className="h-3.5 w-3.5 accent-primary"
            />
            Cỡ chữ tự động (vừa khung)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateElement({ bold: !selectedElement.bold })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${
                selectedElement.bold ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              In đậm
            </button>
            <button
              type="button"
              onClick={() => onUpdateElement({ underline: !selectedElement.underline })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs underline ${
                selectedElement.underline ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              Gạch chân
            </button>
          </div>
        </>
      )}

      {selectedElement.type === "shape" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(["rectangle", "ellipse", "diamond", "triangle", "star"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onUpdateElement({ kind })}
                className={`rounded-lg border px-2 py-1.5 text-xs ${
                  selectedElement.kind === kind ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
                }`}
              >
                {kind === "rectangle" ? "Chữ nhật" : kind === "ellipse" ? "Hình tròn" : kind === "diamond" ? "Kim cương" : kind === "triangle" ? "Tam giác" : "Ngôi sao"}
              </button>
            ))}
          </div>
          <Textarea
            id="shape-content"
            label="Nội dung (tùy chọn)"
            rows={3}
            defaultValue={selectedElement.content}
            onChange={(e) => onUpdateElement({ content: e.target.value })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu nền</span>
            <input type="color" value={selectedElement.fill} onChange={(e) => onUpdateElement({ fill: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu viền</span>
            <input type="color" value={selectedElement.stroke} onChange={(e) => onUpdateElement({ stroke: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu chữ</span>
            <input type="color" value={selectedElement.textColor} onChange={(e) => onUpdateElement({ textColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          {selectedElement.kind === "rectangle" && (
            <Input id="shape-radius" type="number" label="Bo góc (px)" defaultValue={selectedElement.borderRadius} onChange={(e) => onUpdateElement({ borderRadius: Number(e.target.value) || 0 })} />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateElement({ bold: !selectedElement.bold })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold ${
                selectedElement.bold ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              In đậm
            </button>
            <button
              type="button"
              onClick={() => onUpdateElement({ underline: !selectedElement.underline })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs underline ${
                selectedElement.underline ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              Gạch chân
            </button>
          </div>
        </>
      )}

      {selectedElement.type === "text" && (
        <>
          <Textarea
            id="text-content"
            label="Nội dung"
            rows={3}
            defaultValue={selectedElement.content}
            onChange={(e) => onUpdateElement({ content: e.target.value })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu chữ</span>
            <input type="color" value={selectedElement.textColor} onChange={(e) => onUpdateElement({ textColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu nền</span>
            <input
              type="color"
              value={selectedElement.bgColor === "transparent" ? "#ffffff" : selectedElement.bgColor}
              onChange={(e) => onUpdateElement({ bgColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-border"
            />
            <button type="button" onClick={() => onUpdateElement({ bgColor: "transparent" })} className="text-xs text-muted hover:underline">
              Bỏ màu nền
            </button>
          </label>
          <Input
            id="text-fontsize"
            type="number"
            label="Cỡ chữ (px)"
            disabled={selectedElement.autoFontSize}
            defaultValue={selectedElement.fontSize}
            onChange={(e) => onUpdateElement({ fontSize: Number(e.target.value) || 24 })}
          />
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={selectedElement.autoFontSize}
              onChange={(e) => onUpdateElement({ autoFontSize: e.target.checked })}
              className="h-3.5 w-3.5 accent-primary"
            />
            Cỡ chữ tự động (vừa khung)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateElement({ bold: !selectedElement.bold })}
              className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                selectedElement.bold ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              In đậm
            </button>
            <button
              type="button"
              onClick={() => onUpdateElement({ italic: !selectedElement.italic })}
              className={`rounded-lg border px-2 py-1.5 text-xs italic ${
                selectedElement.italic ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              In nghiêng
            </button>
            <button
              type="button"
              onClick={() => onUpdateElement({ underline: !selectedElement.underline })}
              className={`rounded-lg border px-2 py-1.5 text-xs underline ${
                selectedElement.underline ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              Gạch chân
            </button>
            <button
              type="button"
              onClick={() => onUpdateElement({ strikethrough: !selectedElement.strikethrough })}
              className={`rounded-lg border px-2 py-1.5 text-xs line-through ${
                selectedElement.strikethrough ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
              }`}
            >
              Gạch ngang
            </button>
          </div>
          <div className="flex gap-2">
            {(
              [
                { value: "left", icon: AlignLeft },
                { value: "center", icon: AlignCenter },
                { value: "right", icon: AlignRight },
                { value: "justify", icon: AlignJustify },
              ] as { value: TextAlign; icon: typeof AlignLeft }[]
            ).map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onUpdateElement({ align: value })}
                className={`flex flex-1 items-center justify-center rounded-lg border py-1.5 ${
                  selectedElement.align === value ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={selectedElement.bulletList} onChange={(e) => onUpdateElement({ bulletList: e.target.checked })} />
            Danh sách gạch đầu dòng
          </label>
          <p className="text-xs text-muted">
            {selectedElement.links.length > 0
              ? `${selectedElement.links.length} liên kết đã gắn vào một phần chữ.`
              : "Chưa có liên kết nào."}{" "}
            Để thêm/xóa liên kết: bấm đúp để soạn chữ, bôi đen đoạn muốn gắn link, rồi dùng nút liên kết trên thanh công cụ nổi.
          </p>
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
                setUploadError(null);
                const result = await uploadWhiteboardFile("/api/admin/upload-whiteboard-image", file);
                setUploading(false);
                if (result.url) onUpdateElement({ url: result.url });
                else setUploadError(result.error);
              }}
            />
          </label>
          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
          {selectedElement.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedElement.url} alt="" className="max-h-32 w-full rounded border border-border object-contain" />
          )}
          <Input id="image-alt" label="Mô tả ảnh (alt, tùy chọn)" defaultValue={selectedElement.alt ?? ""} onChange={(e) => onUpdateElement({ alt: e.target.value })} />
        </>
      )}

      {selectedElement.type === "video" && (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Video (MP4, tối đa ~4MB)</span>
            <UploadButton
              accept="video/mp4"
              disabled={uploading}
              label="Tải video lên"
              onFile={async (file) => {
                setUploading(true);
                setUploadError(null);
                const result = await uploadWhiteboardFile("/api/admin/upload-whiteboard-video", file);
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
              <button type="button" onClick={() => onUpdateElement({ url: "" })} className="shrink-0 text-xs text-danger hover:underline">
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

      {selectedElement.type === "linkCard" && (
        <>
          <Input
            id="link-url"
            label="URL"
            defaultValue={selectedElement.url}
            placeholder="https://..."
            onChange={(e) => {
              const url = e.target.value.trim();
              onUpdateElement({ url, domain: domainOfUrl(url) });
            }}
          />
          <Input id="link-title" label="Tiêu đề hiển thị (tùy chọn)" defaultValue={selectedElement.title} onChange={(e) => onUpdateElement({ title: e.target.value })} />
        </>
      )}

      {selectedElement.type === "connector" && (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-foreground">Màu đường nối</span>
            <input type="color" value={selectedElement.stroke} onChange={(e) => onUpdateElement({ stroke: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-border" />
          </label>
          <Input
            id="connector-width"
            type="number"
            min={1}
            label="Độ dày (px)"
            defaultValue={selectedElement.strokeWidth}
            onChange={(e) => onUpdateElement({ strokeWidth: Number(e.target.value) || 1 })}
          />
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={selectedElement.arrowStart} onChange={(e) => onUpdateElement({ arrowStart: e.target.checked })} />
              Mũi tên đầu
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={selectedElement.arrowEnd} onChange={(e) => onUpdateElement({ arrowEnd: e.target.checked })} />
              Mũi tên cuối
            </label>
          </div>
          <div className="space-y-1">
            <span className="block text-sm text-foreground">Kiểu đường</span>
            <div className="grid grid-cols-3 gap-2">
              {(["straight", "elbow", "curved"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onUpdateElement({ kind })}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    selectedElement.kind === kind ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
                  }`}
                >
                  {kind === "straight" ? "Thẳng" : kind === "elbow" ? "Gấp khúc" : "Cong"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-sm text-foreground">Kiểu nét</span>
            <div className="grid grid-cols-3 gap-2">
              {(["solid", "dashed", "dotted"] as const).map((dash) => (
                <button
                  key={dash}
                  type="button"
                  onClick={() => onUpdateElement({ dash })}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    selectedElement.dash === dash ? "border-primary bg-primary-bg text-primary" : "border-border text-muted"
                  }`}
                >
                  {dash === "solid" ? "Liền" : dash === "dashed" ? "Đứt" : "Chấm"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
