"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Lock, PlayCircle, Volume2 } from "lucide-react";

export type SidebarLesson = {
  id: string;
  title: string;
  youtubeId: string | null;
  durationSeconds: number | null;
  locked: boolean;
  isCurrent: boolean;
  isDone?: boolean;
  number: number;
};

// "165 phút" not "2h 45m" — matches the plain-minutes convention on the
// reference design the user shared (LadiPage Learning's own module
// sidebar), even past 60 minutes.
function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} phút`;
}

export type SidebarGroup = {
  chapterId: string | null;
  chapterTitle: string | null;
  lessons: SidebarLesson[];
};

type Variant = "light" | "dark";

// Same variant convention as collapsible-section.tsx: a card on a dark
// background needs the dark- prefixed tokens (--dark-muted/--dark-border/
// --dark-surface-raised) instead of the light-mode neutral tokens, which are
// unreadable there — brand/semantic colors (primary, success) are
// untouched, matching the "semantic color isn't part of the theme"
// convention noted elsewhere in this app.
const VARIANT_STYLES: Record<
  Variant,
  { label: string; chev: string; thumbBg: string; thumbIcon: string; badgeBorder: string; badgeBg: string; badgeText: string; title: string; locked: string; lockedRow: string; hover: string }
> = {
  light: {
    label: "text-faint",
    chev: "text-faint",
    thumbBg: "bg-faint-bg",
    thumbIcon: "text-faint",
    badgeBorder: "border-border",
    badgeBg: "bg-surface",
    badgeText: "text-muted",
    title: "text-foreground",
    locked: "text-faint",
    lockedRow: "text-muted/60",
    hover: "text-muted hover:bg-surface-hover",
  },
  dark: {
    label: "text-dark-muted/70",
    chev: "text-dark-muted/70",
    thumbBg: "bg-dark-surface-raised",
    thumbIcon: "text-dark-muted",
    badgeBorder: "border-dark-border",
    badgeBg: "bg-dark-surface-raised",
    badgeText: "text-dark-muted",
    title: "text-dark-foreground",
    locked: "text-dark-muted/50",
    lockedRow: "text-dark-muted/50",
    hover: "text-dark-muted hover:bg-dark-surface-raised",
  },
};

// Shared by the student dashboard and guest lesson pages — the two differ
// only in how a locked row behaves (a guest's locked row is a real link to
// /login; a student's is a plain non-interactive div, since there's nowhere
// useful to send an already-logged-in student) and in whether "done"
// checkmarks apply at all (guests have no completion state). Everything
// else — thumbnail, play icon, chapter grouping/collapse, the height cap —
// is identical, so one component renders both instead of drifting apart.
export function CourseLessonSidebar({
  groups,
  showChapterHeadings,
  lessonBasePath,
  lockedHref,
  lockedMessage,
  variant = "light",
}: {
  groups: SidebarGroup[];
  showChapterHeadings: boolean;
  // A plain string, not a `(id) => string` callback — a Server Component
  // parent can't pass a function prop across the RSC boundary into this
  // "use client" component (only serializable values or "use server"
  // actions survive that boundary), same reasoning as MainContent's
  // fullBleedPattern or NavItem's pre-rendered icon elsewhere in this app.
  lessonBasePath: string;
  lockedHref?: string;
  lockedMessage: string;
  variant?: Variant;
}) {
  const styles = VARIANT_STYLES[variant];

  // Whichever chapter holds the lesson currently being viewed starts open;
  // every other chapter starts collapsed — keeps a long curriculum compact
  // by default without ever hiding where the viewer actually is. Collapsed
  // is a per-chapterId denylist (default "open") rather than an allowlist,
  // so a NEWLY added chapter (after this component already mounted once)
  // still defaults to open instead of needing its id added anywhere.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    if (!showChapterHeadings) return new Set();
    const activeGroupKey = groups.find((g) => g.lessons.some((l) => l.isCurrent));
    return new Set(
      groups
        .filter((g) => g !== activeGroupKey)
        .map((g) => g.chapterId ?? "__unassigned__")
    );
  });

  function toggle(key: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={showChapterHeadings ? "max-h-[420px] space-y-4 overflow-y-auto pr-1" : "space-y-1"}>
      {groups.map((group) => {
        const key = group.chapterId ?? "__unassigned__";
        const collapsed = showChapterHeadings && collapsedIds.has(key);
        return (
          <div key={key}>
            {showChapterHeadings && (
              <button
                type="button"
                onClick={() => toggle(key)}
                className="flex w-full items-center gap-1.5 px-3 py-1 text-left"
                aria-expanded={!collapsed}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${styles.chev} ${collapsed ? "-rotate-90" : ""}`}
                />
                <span className={`flex-1 text-[11px] font-semibold uppercase tracking-wide ${styles.label}`}>
                  {group.chapterTitle ?? "Chưa xếp chương"}
                </span>
              </button>
            )}
            {!collapsed && (
              <ul className="space-y-1">
                {group.lessons.map((lesson) => (
                  <SidebarRow
                    key={lesson.id}
                    lesson={lesson}
                    href={lesson.locked ? lockedHref : `${lessonBasePath}/${lesson.id}`}
                    lockedMessage={lockedMessage}
                    styles={styles}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Thumbnail({
  youtubeId,
  durationSeconds,
  styles,
}: {
  youtubeId: string | null;
  durationSeconds: number | null;
  styles: (typeof VARIANT_STYLES)["light"];
}) {
  return (
    <span className={`relative flex h-11 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md ${styles.thumbBg}`}>
      {youtubeId ? (
        <Image
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      ) : (
        <PlayCircle className={`h-4 w-4 ${styles.thumbIcon}`} />
      )}
      {youtubeId && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <PlayCircle className="h-5 w-5 text-white drop-shadow" />
        </span>
      )}
      {durationSeconds != null && (
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-medium leading-tight text-white">
          {formatDuration(durationSeconds)}
        </span>
      )}
    </span>
  );
}

function SidebarRow({
  lesson,
  href,
  lockedMessage,
  styles,
}: {
  lesson: SidebarLesson;
  href: string | undefined;
  lockedMessage: string;
  styles: (typeof VARIANT_STYLES)["light"];
}) {
  const content = (
    <>
      <span className="relative shrink-0">
        <Thumbnail youtubeId={lesson.youtubeId} durationSeconds={lesson.durationSeconds} styles={styles} />
        <span
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${styles.badgeBorder} ${styles.badgeBg} ${
            lesson.locked ? styles.locked : lesson.isCurrent ? "border-primary text-primary" : styles.badgeText
          }`}
        >
          {lesson.isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : lesson.locked ? <Lock className="h-2 w-2" /> : lesson.number}
        </span>
      </span>
      <span className="min-w-0">
        {lesson.isCurrent && (
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
            <Volume2 className="h-3 w-3" />
            Đang xem
          </span>
        )}
        <span className={`line-clamp-2 block ${lesson.locked ? "" : styles.title}`}>{lesson.title}</span>
        {lesson.locked && <span className={`mt-0.5 block text-xs italic ${styles.locked}`}>{lockedMessage}</span>}
      </span>
    </>
  );

  const rowClass = `flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    lesson.locked ? styles.lockedRow : lesson.isCurrent ? "bg-primary-bg-strong" : styles.hover
  }`;

  if (href) {
    return (
      <li>
        <Link href={href} prefetch={false} className={rowClass}>
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <div className={rowClass}>{content}</div>
    </li>
  );
}
