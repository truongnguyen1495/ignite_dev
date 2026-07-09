"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateQuizTitleAction } from "../actions";
import { BackLink } from "@/components/ui/back-link";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function QuizTitleForm({
  quizId,
  title,
  lessonId,
  lessonTitle,
}: {
  quizId: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const [error, formAction, pending] = useActionState(updateQuizTitleAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <>
      <div className="sticky top-0 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background py-3">
        <div>
          <BackLink href={`/admin/lessons/${lessonId}`}>{lessonTitle}</BackLink>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        <Button
          type="submit"
          form="quiz-title-form"
          variant={isDirty ? "primary" : "secondary"}
          disabled={pending || !isDirty}
          isLoading={pending}
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu bài viết" : "Đã lưu"}
        </Button>
      </div>

      <Card className="max-w-xl">
        <form
          id="quiz-title-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="quizId" value={quizId} />
          <Input id="title" name="title" defaultValue={title} required label="Tiêu đề bài test" />
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Card>
    </>
  );
}
