"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setLessonWatchSettingsAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function LessonWatchProgressForm({
  lessonWatchThresholdPercent,
  showLessonWatchProgressToGuest,
  enforceLessonWatchForHocVien,
}: {
  lessonWatchThresholdPercent: number;
  showLessonWatchProgressToGuest: boolean;
  enforceLessonWatchForHocVien: boolean;
}) {
  const [error, formAction, pending] = useActionState(setLessonWatchSettingsAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  // See the matching comment in shipping-fee-form.tsx — same reason, and the
  // checkboxes below are exactly why the listener sits on the <form> rather
  // than on each field: change events bubble, so one handler covers the
  // number input and both toggles without touching any of them.
  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Theo dõi tiến độ xem video bài học</p>
        <p className="text-sm text-muted">
          Đo thời gian thực thành viên thực sự để video phát (không tính khi tua nhanh) trên các bài học
          khóa học có video YouTube. Nút &quot;Đánh dấu hoàn thành&quot; bị khóa cho tới khi xem đủ % dưới
          đây — chỉ áp dụng cho bài học đã lấy được thời lượng video (xem link YouTube ở bài học đó để
          ngưỡng có hiệu lực).
        </p>
      </div>

      <Input
        id="lessonWatchThresholdPercent"
        name="lessonWatchThresholdPercent"
        type="number"
        min={1}
        max={100}
        defaultValue={lessonWatchThresholdPercent}
        className="max-w-[140px]"
        label="Ngưỡng % cần xem để mở khóa"
      />

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="showLessonWatchProgressToGuest"
            defaultChecked={showLessonWatchProgressToGuest}
            className="h-4 w-4 accent-primary"
          />
          Hiện % đã xem cho khách (chỉ để thông tin, khách không có nút hoàn thành nên không bị khóa gì)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="enforceLessonWatchForHocVien"
            defaultChecked={enforceLessonWatchForHocVien}
            className="h-4 w-4 accent-primary"
          />
          Bắt buộc với thành viên
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        type="submit"
        size="sm"
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu" : "Đã lưu"}
      </Button>
    </form>
  );
}
