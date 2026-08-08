"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Pencil } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { Button } from "./button";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
// Square output — matches the circular avatar this feeds everywhere, and is
// generous enough for the largest render size (the profile page's own
// 88px preview) without producing an oversized file.
const OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không đọc được ảnh."));
    img.src = src;
  });
}

// react-easy-crop hands back the crop rectangle in the SOURCE image's own
// pixel space (croppedAreaPixels) regardless of zoom/pan — drawing straight
// from that rectangle onto a fixed 512x512 canvas is all that's needed to
// produce the final square, no extra scale math required.
async function cropToJpegFile(imageSrc: string, area: Area): Promise<File> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh."))), "image/jpeg", 0.92)
  );
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function AvatarCropInput({
  name,
  initialUrl,
  onUploaded,
  onRemove,
}: {
  name: string;
  initialUrl: string | null;
  onUploaded?: (url: string) => void;
  // A server action (see removeOwnAvatarAction in dashboard/profile/actions.ts)
  // rather than another fetch()-driven API route — clearing the field needs
  // no file upload, so it fits the same "plain server action" pattern the
  // rest of the profile page already uses for name/password updates.
  onRemove: () => Promise<string | undefined>;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setError("Chỉ hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Ảnh vượt quá giới hạn 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);
  }

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  function closeCropModal() {
    setRawImage(null);
  }

  async function handleSave() {
    if (!rawImage || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const file = await cropToJpegFile(rawImage, croppedArea);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tải ảnh lên thất bại.");
      setUrl(data.url);
      setRawImage(null);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const result = await onRemove();
      if (result) {
        setError(result);
        return;
      }
      setUrl(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <UserAvatar src={url} name={name} size={72} className="text-2xl" />
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          aria-label="Đổi ảnh đại diện"
          title="Đổi ảnh đại diện"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
      <div className="space-y-1">
        <div className="flex gap-3">
          <button type="button" onClick={openFilePicker} disabled={uploading} className="text-sm font-semibold text-primary hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
            Đổi ảnh đại diện
          </button>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="text-sm font-semibold text-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa ảnh
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={closeCropModal}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-border-strong bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-foreground">Cắt ảnh đại diện</h2>
            <p className="mt-1 text-xs text-muted">Kéo để dịch chuyển, dùng thanh trượt để phóng to/thu nhỏ.</p>

            <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg bg-background">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-lg text-faint">&minus;</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-lg text-faint">&#43;</span>
            </div>

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeCropModal} disabled={uploading}>
                Hủy
              </Button>
              <Button type="button" size="sm" onClick={handleSave} isLoading={uploading}>
                {uploading ? "Đang lưu..." : "Lưu ảnh đại diện"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
