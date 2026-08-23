"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Video } from "lucide-react";
import { createVendorCourseChapterAction, deleteVendorCourseChapterAction, deleteVendorCourseLessonAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { VendorLessonForm } from "./vendor-lesson-form";

type Lesson = { id: string; title: string; content: string; youtubeId: string | null; chapterId: string | null };
type Chapter = { id: string; title: string; lessons: Lesson[] };

function AddChapterForm({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Thêm chương
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createVendorCourseChapterAction(courseId, value);
          if (result) {
            setError(result);
            return;
          }
          setValue("");
          setOpen(false);
          setError(null);
          router.refresh();
        });
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tên chương"
        className="w-40 rounded-lg border border-border-strong bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
      <Button type="submit" size="sm" disabled={pending} isLoading={pending}>
        Thêm
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Hủy
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}

function DeleteChapterButton({ chapterId, courseId }: { chapterId: string; courseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Xóa chương (bài giảng bên trong sẽ chuyển về Chưa xếp chương)"
      onClick={async () => {
        const ok = await confirm({
          title: "Xóa chương này?",
          description: "Các bài giảng trong chương sẽ chuyển về mục Chưa xếp chương, không bị xóa.",
          confirmLabel: "Xóa chương",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteVendorCourseChapterAction(chapterId, courseId);
          router.refresh();
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5 text-danger" />
    </Button>
  );
}

function LessonRow({ courseId, lesson, chapters }: { courseId: string; lesson: Lesson; chapters: { id: string; title: string }[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  if (editing) {
    return (
      <VendorLessonForm
        courseId={courseId}
        lessonId={lesson.id}
        title={lesson.title}
        content={lesson.content}
        youtubeId={lesson.youtubeId}
        chapterId={lesson.chapterId}
        chapters={chapters}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
        {lesson.youtubeId && <Video className="h-3.5 w-3.5 shrink-0 text-danger" />}
        <span className="truncate">{lesson.title}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Sửa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: `Xóa bài giảng "${lesson.title}"?`,
              confirmLabel: "Xóa",
              tone: "danger",
            });
            if (!ok) return;
            startTransition(async () => {
              await deleteVendorCourseLessonAction(lesson.id, courseId);
              router.refresh();
            });
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-danger" />
        </Button>
      </div>
    </div>
  );
}

function AddLessonRow({ courseId, chapterId, chapters }: { courseId: string; chapterId: string | null; chapters: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Thêm bài giảng
      </Button>
    );
  }

  return (
    <VendorLessonForm
      courseId={courseId}
      chapterId={chapterId}
      chapters={chapters}
      onSuccess={() => {
        setOpen(false);
        router.refresh();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

export function VendorCourseOutline({
  courseId,
  chapters,
  unassignedLessons,
}: {
  courseId: string;
  chapters: Chapter[];
  unassignedLessons: Lesson[];
}) {
  const chapterOptions = chapters.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Chương &amp; bài giảng</h2>
        <AddChapterForm courseId={courseId} />
      </div>

      {chapters.length === 0 && unassignedLessons.length === 0 && (
        <p className="text-sm text-muted">Chưa có chương hay bài giảng nào — bắt đầu bằng cách thêm chương hoặc bài giảng.</p>
      )}

      {chapters.map((chapter) => (
        <div key={chapter.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{chapter.title}</h3>
            <DeleteChapterButton chapterId={chapter.id} courseId={courseId} />
          </div>
          <div className="space-y-1.5">
            {chapter.lessons.map((lesson) => (
              <LessonRow key={lesson.id} courseId={courseId} lesson={lesson} chapters={chapterOptions} />
            ))}
          </div>
          <AddLessonRow courseId={courseId} chapterId={chapter.id} chapters={chapterOptions} />
        </div>
      ))}

      {(unassignedLessons.length > 0 || chapters.length === 0) && (
        <div className="space-y-2">
          {chapters.length > 0 && <h3 className="text-sm font-medium text-muted">Chưa xếp chương</h3>}
          <div className="space-y-1.5">
            {unassignedLessons.map((lesson) => (
              <LessonRow key={lesson.id} courseId={courseId} lesson={lesson} chapters={chapterOptions} />
            ))}
          </div>
          <AddLessonRow courseId={courseId} chapterId={null} chapters={chapterOptions} />
        </div>
      )}
    </div>
  );
}
