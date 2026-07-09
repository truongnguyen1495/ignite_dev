"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Loader2, X } from "lucide-react";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function CoverImageInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại.");
      }
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">Ảnh bìa (tùy chọn)</label>
      <div className="flex items-start gap-3">
        {url ? (
          <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Ảnh bìa khóa học" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setUrl("")}
              title="Xóa ảnh"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
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
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Đang tải..." : "Tải ảnh lên"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input type="hidden" name="coverImageUrl" value={url} />
    </div>
  );
}
