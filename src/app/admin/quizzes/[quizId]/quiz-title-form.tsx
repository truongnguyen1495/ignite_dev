"use client";

import { useActionState } from "react";
import { updateQuizTitleAction } from "../actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function QuizTitleForm({ quizId, title }: { quizId: string; title: string }) {
  const [error, formAction, pending] = useActionState(updateQuizTitleAction, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="quizId" value={quizId} />
      <div className="flex-1">
        <Input id="title" name="title" defaultValue={title} required label="Tiêu đề bài test" />
      </div>
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang lưu..." : "Lưu"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
