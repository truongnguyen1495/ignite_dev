"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function SettingsForm({ passPercentage }: { passPercentage: number }) {
  const [error, formAction, pending] = useActionState(updateSettingsAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Input
        id="passPercentage"
        name="passPercentage"
        type="number"
        min={1}
        max={100}
        defaultValue={passPercentage}
        required
        label="Ngưỡng điểm đạt (%) mặc định"
        hint="Học viên đạt khi điểm bài test ≥ ngưỡng này. Áp dụng cho các lượt làm bài mới của mọi bài test chưa đặt ngưỡng riêng; lượt đã làm trước đó giữ nguyên kết quả."
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang lưu..." : "Lưu cài đặt"}
      </Button>
    </form>
  );
}
