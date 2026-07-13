"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setLibraryItemGuestAccessAction } from "../actions";
import { Input } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LibraryItemGuestAccessForm({
  libraryItemId,
  filePath,
  pageCount,
  guestPreviewPages,
  visibleToGuest: initialVisibleToGuest,
  featuredOnHome,
}: {
  libraryItemId: string;
  filePath: string;
  pageCount: number | null;
  guestPreviewPages: number | null;
  visibleToGuest: boolean;
  featuredOnHome: boolean;
}) {
  const [error, formAction, pending] = useActionState(setLibraryItemGuestAccessAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [visibleToGuest, setVisibleToGuest] = useState(initialVisibleToGuest);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Card padding="lg" className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Cấp quyền cho khách</h2>

      <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
        <input type="hidden" name="libraryItemId" value={libraryItemId} />
        <input type="hidden" name="filePath" value={filePath} />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="visibleToGuest"
            checked={visibleToGuest}
            onChange={(e) => setVisibleToGuest(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Hiển thị công khai cho khách (chỉ đọc thử một phần)
        </label>

        {visibleToGuest && (
          <Input
            id="guestPreviewPages"
            name="guestPreviewPages"
            type="number"
            min={1}
            max={pageCount ?? undefined}
            defaultValue={guestPreviewPages ?? 5}
            label="Số trang cho khách đọc thử"
            hint={pageCount ? `File có ${pageCount} trang.` : "Chưa có file PDF."}
          />
        )}

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="featuredOnHome"
            defaultChecked={featuredOnHome}
            className="h-4 w-4 accent-primary"
          />
          Hiện trong mục &quot;Ebook nổi bật&quot; ở trang chủ khách
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant={isDirty ? "primary" : "secondary"}
            disabled={pending || !isDirty}
            isLoading={pending}
          >
            {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
