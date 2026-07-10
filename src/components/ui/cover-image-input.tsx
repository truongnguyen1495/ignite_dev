"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TARGET_RATIO = 16 / 9;
const RATIO_TOLERANCE = 0.1;

// Doesn't block the upload — just tells the admin their image will get
// cropped to fit the 16:9 thumbnail (cards render it via object-cover),
// since the ratio check itself can't always run (e.g. a corrupt file) and
// shouldn't be a hard gate either way.
function checkAspectRatio(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Math.abs(img.width / img.height - TARGET_RATIO) < RATIO_TOLERANCE);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(true);
    };
    img.src = objectUrl;
  });
}

export function CoverImageInput({
  name = "coverImageUrl",
  label = "Ảnh bìa (tùy chọn, khuyến nghị tỉ lệ 16:9)",
  alt = "Ảnh bìa",
  defaultValue = "",
  onChange,
}: {
  name?: string;
  label?: string;
  alt?: string;
  defaultValue?: string;
  onChange?: () => void;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setWarning(null);
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setError("Chỉ hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Ảnh vượt quá giới hạn 5MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setWarning(null);
    const isCorrectRatio = await checkAspectRatio(file);
    if (!isCorrectRatio) {
      setWarning("Ảnh không đúng tỉ lệ 16:9 — vẫn tải lên được nhưng sẽ bị cắt cho khớp khung hiển thị.");
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại.");
      }
      setUrl(data.url);
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-start gap-3">
        {url ? (
          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setUrl("");
                onChange?.();
              }}
              title="Xóa ảnh"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex aspect-video w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
            Chưa có ảnh
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Đang tải..." : "Tải ảnh lên"}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
          {!error && warning && <p className="text-xs text-warning">{warning}</p>}
        </div>
      </div>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
