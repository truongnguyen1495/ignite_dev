"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// The server route itself allows up to 50MB, but Vercel's own request-body
// limit for a Serverless Function (a few MB on the Hobby plan) sits well
// below that and rejects an oversized request before our code ever runs —
// the browser sees a 413 with a plain-text body, not our JSON error shape.
// Capping the client-side check here means most oversized files get a clear
// message immediately instead of a round-trip that ends in a 413.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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
      setError(
        `File ${(file.size / 1024 / 1024).toFixed(1)}MB vượt quá giới hạn ~4MB của server hiện tại. Vui lòng nén nhỏ file lại (ví dụ giảm chất lượng ảnh scan) rồi thử lại.`
      );
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-library-file", { method: "POST", body: formData });
      if (!res.ok) {
        // A 413 from Vercel's own platform limit (request too large before
        // our route even runs) comes back as a plain-text body, not JSON —
        // res.json() would throw its own confusing "Unexpected token"
        // error, masking the real problem.
        if (res.status === 413) {
          throw new Error("File quá lớn so với giới hạn upload của server. Vui lòng nén nhỏ file lại rồi thử lại.");
        }
        let message = "Tải file lên thất bại.";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // non-JSON error body — keep the generic message above
        }
        throw new Error(message);
      }
      const data = await res.json();
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
