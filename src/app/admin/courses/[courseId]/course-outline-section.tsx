"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Trash2, ChevronDown, Video, Pencil } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseLessonForm } from "./lessons/course-lesson-form";
import { DeleteCourseLessonInlineButton } from "./delete-course-lesson-inline-button";
import { ToggleCourseLessonGuestButton } from "./toggle-course-lesson-guest-button";
import {
  createCourseChapterAction,
  renameCourseChapterAction,
  deleteCourseChapterAction,
  reorderCourseChaptersAction,
  reorderCourseOutlineAction,
} from "../actions";

export type CourseChapterItem = { id: string; title: string };

type CourseLesson = {
  id: string;
  title: string;
  content: string;
  youtubeId: string | null;
  order: number;
  visibleToGuest: boolean;
  chapterId: string | null;
};

// Sentinel group key for lessons with no chapter — never collides with a
// real CourseChapter id (those are cuids from Prisma's @default(cuid())).
const UNASSIGNED = "__unassigned__";

function groupLessons(lessons: CourseLesson[], chapterIds: string[]): Record<string, string[]> {
  const buckets: Record<string, CourseLesson[]> = {};
  for (const key of [...chapterIds, UNASSIGNED]) buckets[key] = [];
  for (const lesson of lessons) {
    const key = lesson.chapterId && buckets[lesson.chapterId] ? lesson.chapterId : UNASSIGNED;
    buckets[key].push(lesson);
  }
  const groups: Record<string, string[]> = {};
  for (const key of Object.keys(buckets)) {
    groups[key] = buckets[key]
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((l) => l.id);
  }
  return groups;
}

const iconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

function SortableLessonRow({
  lesson,
  courseId,
  chapters,
  expanded,
  onExpand,
  onCollapseAndRefresh,
  onCancel,
}: {
  lesson: CourseLesson;
  courseId: string;
  chapters: CourseChapterItem[];
  expanded: boolean;
  onExpand: () => void;
  onCollapseAndRefresh: () => void;
  onCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    // A card mid-edit shouldn't be draggable out from under its own open
    // form — same reasoning (and the drag handle unmounting below) as
    // course-lessons-section.tsx before this component replaced it.
    disabled: expanded,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (expanded) {
    return (
      <li ref={setNodeRef} style={style}>
        <div className="rounded-lg border border-border bg-surface p-4">
          <CourseLessonForm
            courseId={courseId}
            lessonId={lesson.id}
            title={lesson.title}
            content={lesson.content}
            youtubeId={lesson.youtubeId}
            chapterId={lesson.chapterId}
            chapters={chapters}
            onSuccess={onCollapseAndRefresh}
            onCancel={onCancel}
          />
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 hover:border-primary/50">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Kéo để sắp xếp hoặc chuyển chương"
          className="shrink-0 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-left"
        >
          <span className="text-foreground">{lesson.title}</span>
          <span className="flex items-center gap-2">
            {lesson.youtubeId && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Video className="h-3.5 w-3.5" />
                Có video
              </span>
            )}
            {lesson.visibleToGuest && <Badge color="info">Công khai</Badge>}
          </span>
        </button>
        <ToggleCourseLessonGuestButton lessonId={lesson.id} courseId={courseId} visibleToGuest={lesson.visibleToGuest} />
        <button type="button" title="Sửa" onClick={onExpand} className={iconButtonClass}>
          <Pencil className="h-4 w-4" />
        </button>
        <DeleteCourseLessonInlineButton lessonId={lesson.id} lessonTitle={lesson.title} courseId={courseId} />
      </div>
    </li>
  );
}

// The lesson-level DndContext spans every chapter's list at once (a
// cross-chapter drag needs a shared drop-target namespace), so an empty —
// or currently collapsed, see below — chapter still needs a valid drop
// target. useDroppable is attached to the whole section (header + body),
// not just the lesson <ul>, specifically so a collapsed chapter (its body
// display:none, zero-size, un-hittable) can still be dropped onto via its
// still-visible header.
function ChapterSection({
  chapterId,
  title,
  index,
  lessonIds,
  lessonById,
  courseId,
  chapters,
  expanded,
  onExpandLesson,
  onCollapseAndRefresh,
  onCancelLesson,
  onRename,
  onDelete,
  collapsed,
  onToggleCollapse,
  dragHandleProps,
  setDragNodeRef,
  dragStyle,
}: {
  chapterId: string;
  title: string;
  index: number;
  lessonIds: string[];
  lessonById: Record<string, CourseLesson>;
  courseId: string;
  chapters: CourseChapterItem[];
  expanded: "new" | string | null;
  onExpandLesson: (id: string) => void;
  onCollapseAndRefresh: () => void;
  onCancelLesson: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  dragHandleProps?: { attributes: ReturnType<typeof useSortable>["attributes"]; listeners: ReturnType<typeof useSortable>["listeners"] };
  setDragNodeRef?: (el: HTMLElement | null) => void;
  dragStyle?: { transform: string | undefined; transition: string | undefined; opacity: number };
}) {
  const { setNodeRef: setDropRef } = useDroppable({ id: chapterId });
  const [title_, setTitle] = useState(title);
  const confirm = useConfirm();
  const isUnassigned = chapterId === UNASSIGNED;

  return (
    <div
      ref={setDropRef}
      className={`rounded-xl border overflow-hidden ${isUnassigned ? "border-dashed border-border-strong bg-surface" : "border-border bg-background"}`}
    >
      <div
        ref={setDragNodeRef}
        style={dragStyle as React.CSSProperties | undefined}
        className={`flex items-center gap-2 px-3 py-2.5 ${isUnassigned ? "bg-faint-bg" : "bg-surface"}`}
      >
        {isUnassigned ? (
          <span className="w-4 shrink-0" />
        ) : (
          <button
            type="button"
            {...(dragHandleProps?.attributes ?? {})}
            {...(dragHandleProps?.listeners ?? {})}
            aria-label="Kéo để sắp xếp chương"
            className="shrink-0 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex shrink-0 items-center"
          aria-label={collapsed ? `Mở rộng ${title}` : `Thu gọn ${title}`}
        >
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        {!isUnassigned && (
          <span className="shrink-0 text-xs font-medium text-muted">Chương {String(index + 1).padStart(2, "0")}</span>
        )}
        {isUnassigned ? (
          <span className="min-w-0 flex-1 px-2 py-1 text-sm font-semibold text-muted">{title}</span>
        ) : (
          <input
            value={title_}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              const trimmed = title_.trim();
              if (!trimmed || trimmed === title) {
                setTitle(title);
                return;
              }
              void renameCourseChapterAction(chapterId, courseId, trimmed);
              onRename(chapterId, trimmed);
            }}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-foreground hover:border-border focus:border-primary focus:outline-none"
          />
        )}
        <span className="shrink-0 rounded-full bg-faint-bg px-2 py-0.5 text-[11px] font-medium text-faint">
          {lessonIds.length} bài
        </span>
        {!isUnassigned && (
        <button
          type="button"
          title="Xóa chương"
          onClick={async () => {
            const ok = await confirm({
              title: `Xóa chương "${title}"?`,
              description: "Các bài học trong chương này không bị xóa — chỉ không còn thuộc chương nào nữa.",
              confirmLabel: "Xóa",
              tone: "danger",
            });
            if (!ok) return;
            onDelete(chapterId);
            void deleteCourseChapterAction(chapterId, courseId);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-2.5">
          <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
            {lessonIds.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-strong p-3 text-center text-xs text-faint">
                Chưa có bài học nào — kéo bài học vào đây.
              </p>
            ) : (
              <ul className="space-y-2">
                {lessonIds.map((id) => (
                  <SortableLessonRow
                    key={id}
                    lesson={lessonById[id]}
                    courseId={courseId}
                    chapters={chapters}
                    expanded={expanded === id}
                    onExpand={() => onExpandLesson(id)}
                    onCollapseAndRefresh={onCollapseAndRefresh}
                    onCancel={onCancelLesson}
                  />
                ))}
              </ul>
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

function SortableChapterBlock(props: Omit<Parameters<typeof ChapterSection>[0], "dragHandleProps" | "setDragNodeRef" | "dragStyle">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.chapterId });
  return (
    <ChapterSection
      {...props}
      dragHandleProps={{ attributes, listeners }}
      setDragNodeRef={setNodeRef}
      dragStyle={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    />
  );
}

export function CourseOutlineSection({
  courseId,
  chapters,
  lessons,
}: {
  courseId: string;
  chapters: CourseChapterItem[];
  lessons: CourseLesson[];
}) {
  const router = useRouter();

  const [orderedChapters, setOrderedChapters] = useState(chapters);
  const [prevChapters, setPrevChapters] = useState(chapters);
  if (chapters !== prevChapters) {
    setPrevChapters(chapters);
    setOrderedChapters(chapters);
  }
  const chapterIds = orderedChapters.map((c) => c.id);

  const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const [groups, setGroups] = useState(() => groupLessons(lessons, chapterIds));
  const [prevLessons, setPrevLessons] = useState(lessons);
  if (lessons !== prevLessons) {
    setPrevLessons(lessons);
    setGroups(groupLessons(lessons, chapterIds));
  }

  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<"new" | string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [chapterError, setChapterError] = useState<string | undefined>();
  const [showAddChapter, setShowAddChapter] = useState(false);

  const chapterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );
  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function collapseAndRefresh() {
    setExpanded(null);
    router.refresh();
  }

  function persistOutline(nextGroups: Record<string, string[]>, nextChapterIds: string[]) {
    const order = [...nextChapterIds, UNASSIGNED];
    void reorderCourseOutlineAction(
      courseId,
      order.map((key) => ({ chapterId: key === UNASSIGNED ? null : key, lessonIds: nextGroups[key] ?? [] }))
    );
  }

  function handleChapterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedChapters.findIndex((c) => c.id === active.id);
    const newIndex = orderedChapters.findIndex((c) => c.id === over.id);
    const next = arrayMove(orderedChapters, oldIndex, newIndex);
    setOrderedChapters(next);
    void reorderCourseChaptersAction(courseId, next.map((c) => c.id));
    // Chapter reorder also reshuffles the global lesson order (chapter 1's
    // lessons before chapter 2's, etc. — see reorderCourseOutlineAction's
    // own comment), so resend the outline in the new chapter sequence too.
    persistOutline(groups, next.map((c) => c.id));
  }

  function findContainer(id: string): string | undefined {
    if (id in groups) return id;
    return Object.keys(groups).find((key) => groups[key].includes(id));
  }

  function handleLessonDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setGroups((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const overIndex = overItems.indexOf(String(over.id));
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((id) => id !== active.id),
        [overContainer]: [...overItems.slice(0, newIndex), String(active.id), ...overItems.slice(newIndex)],
      };
    });
  }

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;

    let finalGroups = groups;
    if (activeContainer === overContainer) {
      const items = groups[activeContainer];
      const activeIndex = items.indexOf(String(active.id));
      const overIndex = items.indexOf(String(over.id));
      if (activeIndex !== overIndex && overIndex >= 0) {
        finalGroups = { ...groups, [activeContainer]: arrayMove(items, activeIndex, overIndex) };
        setGroups(finalGroups);
      }
    }
    // A cross-container move already happened live in handleLessonDragOver
    // (setGroups there) — `groups` above already reflects it by the time
    // onDragEnd fires, so this always persists the current, correct state.
    persistOutline(finalGroups, chapterIds);
  }

  function handleAddChapter() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChapterError(undefined);
    void createCourseChapterAction(courseId, trimmed).then((result) => {
      if (result) {
        setChapterError(result);
        return;
      }
      setNewTitle("");
      setShowAddChapter(false);
      router.refresh();
    });
  }

  const unassignedIds = groups[UNASSIGNED] ?? [];

  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Nội dung khóa học ({lessons.length} bài học)</h2>
          <p className="text-xs text-muted">
            Kéo tay cầm ở bài học để đổi thứ tự hoặc chuyển sang chương khác. Chương là tùy chọn.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddChapter((v) => !v)}>
            <Plus className="h-4 w-4" />
            Thêm chương
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setExpanded(expanded === "new" ? null : "new")}
          >
            <Plus className="h-4 w-4" />
            Thêm bài học
          </Button>
        </div>
      </div>

      {showAddChapter && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddChapter();
              }
            }}
            placeholder="Tên chương mới, ví dụ: Nhập môn"
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <Button type="button" size="sm" onClick={handleAddChapter} disabled={!newTitle.trim()}>
            Thêm
          </Button>
        </div>
      )}
      {chapterError && <p className="text-xs text-danger">{chapterError}</p>}

      {expanded === "new" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <CourseLessonForm
            courseId={courseId}
            chapters={orderedChapters}
            onSuccess={collapseAndRefresh}
            onCancel={() => setExpanded(null)}
          />
        </div>
      )}

      <DndContext
        id="course-outline-chapters-dnd"
        sensors={chapterSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChapterDragEnd}
      >
        <DndContext
          id="course-outline-lessons-dnd"
          sensors={lessonSensors}
          collisionDetection={closestCenter}
          onDragOver={handleLessonDragOver}
          onDragEnd={handleLessonDragEnd}
        >
          <div className="space-y-2">
            <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
              {orderedChapters.map((chapter, index) => (
                <SortableChapterBlock
                  key={chapter.id}
                  chapterId={chapter.id}
                  title={chapter.title}
                  index={index}
                  lessonIds={groups[chapter.id] ?? []}
                  lessonById={lessonById}
                  courseId={courseId}
                  chapters={orderedChapters}
                  expanded={expanded}
                  onExpandLesson={(id) => setExpanded(id)}
                  onCollapseAndRefresh={collapseAndRefresh}
                  onCancelLesson={() => setExpanded(null)}
                  onRename={(id, title) =>
                    setOrderedChapters((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
                  }
                  onDelete={(id) => setOrderedChapters((prev) => prev.filter((c) => c.id !== id))}
                  collapsed={!!collapsedMap[chapter.id]}
                  onToggleCollapse={() => setCollapsedMap((prev) => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                />
              ))}
            </SortableContext>

            {/* "Chưa xếp chương" — always last, not part of the chapters
                SortableContext (it isn't a chapter, can't be reordered as
                one), but its lessons ARE part of the lesson-level
                DndContext above like any other group. */}
            <ChapterSection
              chapterId={UNASSIGNED}
              title="Chưa xếp chương"
              index={-1}
              lessonIds={unassignedIds}
              lessonById={lessonById}
              courseId={courseId}
              chapters={orderedChapters}
              expanded={expanded}
              onExpandLesson={(id) => setExpanded(id)}
              onCollapseAndRefresh={collapseAndRefresh}
              onCancelLesson={() => setExpanded(null)}
              onRename={() => {}}
              onDelete={() => {}}
              collapsed={!!collapsedMap[UNASSIGNED]}
              onToggleCollapse={() => setCollapsedMap((prev) => ({ ...prev, [UNASSIGNED]: !prev[UNASSIGNED] }))}
            />
          </div>
        </DndContext>
      </DndContext>
    </Card>
  );
}
