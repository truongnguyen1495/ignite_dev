"use client";

import { useActionState } from "react";
import { updateQuizTitleAction } from "../actions";

export function QuizTitleForm({ quizId, title }: { quizId: string; title: string }) {
  const [error, formAction, pending] = useActionState(updateQuizTitleAction, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="quizId" value={quizId} />
      <div className="flex-1">
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
          Tiêu đề bài test
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
