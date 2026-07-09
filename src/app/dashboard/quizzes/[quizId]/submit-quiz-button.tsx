"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitQuizButton() {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-3">
      {pending && (
        <p className="flex items-center gap-2 rounded-lg border border-info/30 bg-info-bg px-4 py-3 text-sm text-info">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Bài test của bạn đã được nộp, hệ thống đang chấm điểm, vui lòng đợi trong giây lát...
        </p>
      )}
      <Button type="submit" isLoading={pending}>
        {pending ? "Đang nộp bài..." : "Nộp bài"}
      </Button>
    </div>
  );
}
