"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Pencil, Check, Trash2, Plus } from "lucide-react";
import { saveQuizAction, deleteQuestionAction, type SavedQuestion } from "../actions";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm-dialog";

type OptionDraft = { key: string; text: string; isCorrect: boolean };
type QuestionDraft = {
  key: string;
  id: string | null;
  text: string;
  options: OptionDraft[];
  editing: boolean;
};

function toDrafts(questions: SavedQuestion[]): QuestionDraft[] {
  return questions.map((q) => ({
    key: q.id,
    id: q.id,
    text: q.text,
    options: q.options.map((o) => ({ key: o.id, text: o.text, isCorrect: o.isCorrect })),
    editing: false,
  }));
}

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";
const dangerIconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger";

export function QuizEditor({
  quizId,
  title: initialTitle,
  lessonId,
  lessonTitle,
  questions: initialQuestions,
  passThreshold: initialPassThreshold,
  defaultPassPercentage,
}: {
  quizId: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  questions: SavedQuestion[];
  passThreshold: number | null;
  defaultPassPercentage: number;
}) {
  const [displayTitle, setDisplayTitle] = useState(initialTitle);
  const [title, setTitle] = useState(initialTitle);
  const [passThreshold, setPassThreshold] = useState<number | null>(initialPassThreshold);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => toDrafts(initialQuestions));
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function markDirty() {
    setIsDirty(true);
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        key: crypto.randomUUID(),
        id: null,
        text: "",
        options: [
          { key: crypto.randomUUID(), text: "", isCorrect: false },
          { key: crypto.randomUUID(), text: "", isCorrect: false },
        ],
        editing: true,
      },
    ]);
    markDirty();
  }

  function toggleEdit(key: string) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, editing: !q.editing } : q)));
  }

  function updateQuestionText(key: string, text: string) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, text } : q)));
    markDirty();
  }

  function updateOptionText(qKey: string, oKey: string, text: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey ? { ...q, options: q.options.map((o) => (o.key === oKey ? { ...o, text } : o)) } : q
      )
    );
    markDirty();
  }

  function toggleOptionCorrect(qKey: string, oKey: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey
          ? { ...q, options: q.options.map((o) => (o.key === oKey ? { ...o, isCorrect: !o.isCorrect } : o)) }
          : q
      )
    );
    markDirty();
  }

  function addOption(qKey: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === qKey ? { ...q, options: [...q.options, { key: crypto.randomUUID(), text: "", isCorrect: false }] } : q
      )
    );
    markDirty();
  }

  function removeOption(qKey: string, oKey: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === qKey ? { ...q, options: q.options.filter((o) => o.key !== oKey) } : q))
    );
    markDirty();
  }

  async function handleDeleteQuestion(q: QuestionDraft) {
    if (!q.id) {
      setQuestions((qs) => qs.filter((x) => x.key !== q.key));
      return;
    }
    const ok = await confirm({ title: "Xóa câu hỏi này?", confirmLabel: "Xóa", tone: "danger" });
    if (!ok) return;
    const questionId = q.id;
    startTransition(async () => {
      await deleteQuestionAction(questionId, quizId);
      setQuestions((qs) => qs.filter((x) => x.key !== q.key));
    });
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveQuizAction(
        quizId,
        title,
        questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        })),
        passThreshold
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setDisplayTitle(result.title!);
      setTitle(result.title!);
      setQuestions(toDrafts(result.questions!));
      setPassThreshold(result.passThreshold ?? null);
      setIsDirty(false);
    });
  }

  return (
    <>
      <div className="sticky top-0 z-20 space-y-4 border-b border-border bg-background pb-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <BackLink href={`/admin/lessons/${lessonId}`}>{lessonTitle}</BackLink>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">{displayTitle}</h1>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            variant={isDirty ? "primary" : "secondary"}
            disabled={pending || !isDirty}
            isLoading={pending}
          >
            {pending ? "Đang lưu..." : isDirty ? "Lưu bài viết" : "Đã lưu"}
          </Button>
        </div>

        <Card className="max-w-xl space-y-4">
          <Input
            id="quiz-title"
            label="Tiêu đề bài test"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
          />
          <Input
            id="quiz-pass-threshold"
            type="number"
            min={1}
            max={100}
            label="Ngưỡng điểm đạt (%)"
            placeholder={`Mặc định: ${defaultPassPercentage}`}
            value={passThreshold === null ? "" : passThreshold}
            hint="Để trống để dùng ngưỡng mặc định trong Cài đặt. Đặt riêng nếu bài test này cần ngưỡng khác."
            onChange={(e) => {
              setPassThreshold(e.target.value === "" ? null : Number(e.target.value));
              markDirty();
            }}
          />
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted">Câu hỏi ({questions.length})</h2>
          <Button type="button" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            Thêm câu hỏi
          </Button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="space-y-3 pt-6">
        {questions.length === 0 ? (
          <p className="text-sm text-muted">Chưa có câu hỏi nào.</p>
        ) : (
          questions.map((q, index) =>
            q.editing ? (
              <Card key={q.key} className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-muted">Câu hỏi {index + 1}</span>
                  <button type="button" title="Xong" onClick={() => toggleEdit(q.key)} className={iconButtonClass}>
                    <Check className="h-4 w-4" />
                  </button>
                </div>

                <Textarea
                  id={`question-${q.key}`}
                  label="Câu hỏi"
                  rows={3}
                  value={q.text}
                  onChange={(e) => updateQuestionText(q.key, e.target.value)}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Đáp án (tick vào ô vuông cho (các) đáp án đúng — có thể chọn nhiều)
                  </p>
                  {q.options.map((o, oi) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={o.isCorrect}
                        onChange={() => toggleOptionCorrect(q.key, o.key)}
                        className="h-4 w-4 accent-primary"
                      />
                      <input
                        type="text"
                        value={o.text}
                        onChange={(e) => updateOptionText(q.key, o.key, e.target.value)}
                        placeholder={`Đáp án ${oi + 1}`}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(q.key, o.key)}
                          className="text-sm text-danger"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(q.key)}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    + Thêm đáp án
                  </button>
                </div>
              </Card>
            ) : (
              <Card key={q.key}>
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-foreground">
                    {index + 1}. {q.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" title="Sửa" onClick={() => toggleEdit(q.key)} className={iconButtonClass}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Xóa"
                      onClick={() => handleDeleteQuestion(q)}
                      className={dangerIconButtonClass}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {q.options.map((o) => (
                    <li key={o.key} className="flex items-center gap-2">
                      {o.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted" />
                      )}
                      <span className={o.isCorrect ? "font-medium text-foreground" : "text-muted"}>{o.text}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          )
        )}
      </div>
    </>
  );
}
