"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function LibraryFileInput({
  defaultPath = "",
  defaultPageCount = null,
  onChange,
}: {
  defaultPath?: string;
  defaultPageCount?: number | null;
  onChange?: (info: { path: string; pageCount: number | null }) => void;
}) {
  const [path, setPath] = useState(defaultPath);
  const [pageCount, setPageCount] = useState<number | null>(defaultPageCount);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Chỉ hỗ trợ file PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File vượt quá giới hạn 50MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-library-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải file lên thất bại.");
      }
      setPath(data.path);
      setPageCount(data.pageCount);
      onChange?.({ path: data.path, pageCount: data.pageCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải file lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">File PDF</label>
      <div className="flex flex-wrap items-center gap-3">
        {path ? (
          <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <FileText className="h-4 w-4 text-muted" />
            Đã tải lên{pageCount ? ` — ${pageCount} trang` : ""}
            <button
              type="button"
              onClick={() => {
                setPath("");
                setPageCount(null);
                onChange?.({ path: "", pageCount: null });
              }}
              title="Xóa file"
              className="text-muted hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span className="text-xs text-muted">Chưa có file</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelected}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Đang tải..." : path ? "Thay file khác" : "Tải file PDF lên"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      <input type="hidden" name="filePath" value={path} />
      <input type="hidden" name="pageCount" value={pageCount ?? ""} />
    </div>
  );
}
