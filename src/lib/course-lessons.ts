// Shared by the student and guest course-lesson pages' sidebar lists — both
// need the same "group by chapter, unassigned lessons last" shape to show
// chapter headings above their lessons, matching how the admin editor's
// merged outline (course-outline-section.tsx) already groups them. Not
// reused BY that admin component itself: it needs a mutable
// id-keyed-by-group shape to support live drag-and-drop, this needs a plain
// read-only array to render — different enough shapes that sharing one
// function would just add indirection for both call sites.
export function groupLessonsByChapter<L extends { chapterId: string | null }>(
  lessons: L[],
  chapters: { id: string; title: string }[]
): { chapterId: string | null; chapterTitle: string | null; lessons: L[] }[] {
  const byChapter = new Map<string, L[]>();
  const unassigned: L[] = [];
  const chapterIds = new Set(chapters.map((c) => c.id));

  for (const lesson of lessons) {
    if (lesson.chapterId && chapterIds.has(lesson.chapterId)) {
      const list = byChapter.get(lesson.chapterId);
      if (list) list.push(lesson);
      else byChapter.set(lesson.chapterId, [lesson]);
    } else {
      unassigned.push(lesson);
    }
  }

  // Empty chapters are dropped here (unlike the admin outline, which shows
  // them so an admin can still see/manage/delete an empty one) — a heading
  // with nothing under it teaches a learner nothing.
  const groups: { chapterId: string | null; chapterTitle: string | null; lessons: L[] }[] = chapters
    .map((c) => ({ chapterId: c.id as string | null, chapterTitle: c.title as string | null, lessons: byChapter.get(c.id) ?? [] }))
    .filter((g) => g.lessons.length > 0);

  if (unassigned.length > 0) {
    groups.push({ chapterId: null, chapterTitle: null, lessons: unassigned });
  }

  return groups;
}
