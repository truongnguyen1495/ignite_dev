"use client";

import { useActionState } from "react";
import { updateQuizTitleAction } from "../actions";

export function QuizTitleForm({ quizId, title }: { quizId: string; title: string }) {
  const [error, formAction, pending] = useActionState(updateQuizTitleAction, undefined);

  return (
    <form action={formAction} className="flex max-w-xl items-end gap-2">
      <input type="hidden" name="quizId" value={quizId} />
      <div className="flex-1">
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Tiêu đề bài test
        </label>
        <input
          id="title"
          name="title"
          defaultValue={title}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
