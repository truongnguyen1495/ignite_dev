"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EyeOff, Filter, Megaphone } from "lucide-react";
import type { AnnouncementCategory, Level } from "@prisma/client";
import {
  ORDERED_ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_CATEGORY_BADGE_COLOR,
} from "@/lib/announcements";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { Badge } from "@/components/ui/badge";
import { DeleteAnnouncementInlineButton } from "./delete-announcement-inline-button";
import { ToggleAnnouncementGuestButton } from "./toggle-announcement-guest-button";
import { ToggleAnnouncementStudentsVisibilityButton } from "./toggle-announcement-students-visibility-button";

export type AnnouncementListItem = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  category: AnnouncementCategory;
  minLevel: Level | null;
  visibleToGuest: boolean;
  visibleToStudents: boolean;
  publishedAtLabel: string;
};

// "ALL_STUDENTS" stands in for minLevel: null (the "Tất cả học viên" audience)
// so it can live in the same Set as the real Level values.
type AudienceFilterValue = "ALL_STUDENTS" | Level;
type GuestFilterValue = "public" | "private";
type HiddenFilterValue = "hidden" | "visible";

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

const checkboxClass = "h-4 w-4 accent-primary";

export function AnnouncementsList({ announcements }: { announcements: AnnouncementListItem[] }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Set<AnnouncementCategory>>(new Set());
  const [audienceFilter, setAudienceFilter] = useState<Set<AudienceFilterValue>>(new Set());
  const [guestFilter, setGuestFilter] = useState<Set<GuestFilterValue>>(new Set());
  const [hiddenFilter, setHiddenFilter] = useState<Set<HiddenFilterValue>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  const activeFilterCount =
    categoryFilter.size + audienceFilter.size + guestFilter.size + hiddenFilter.size;

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(a.category)) return false;
      if (audienceFilter.size > 0) {
        const key: AudienceFilterValue = a.minLevel ?? "ALL_STUDENTS";
        if (!audienceFilter.has(key)) return false;
      }
      if (guestFilter.size > 0) {
        const key: GuestFilterValue = a.visibleToGuest ? "public" : "private";
        if (!guestFilter.has(key)) return false;
      }
      if (hiddenFilter.size > 0) {
        const key: HiddenFilterValue = a.visibleToStudents ? "visible" : "hidden";
        if (!hiddenFilter.has(key)) return false;
      }
      return true;
    });
  }, [announcements, categoryFilter, audienceFilter, guestFilter, hiddenFilter]);

  function clearFilters() {
    setCategoryFilter(new Set());
    setAudienceFilter(new Set());
    setGuestFilter(new Set());
    setHiddenFilter(new Set());
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              activeFilterCount > 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted hover:bg-surface-hover"
            }`}
          >
            <Filter className="h-4 w-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 z-10 mt-2 w-72 space-y-4 rounded-xl border border-border bg-surface p-4 shadow-lg">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Chuyên mục</p>
                {ORDERED_ANNOUNCEMENT_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={categoryFilter.has(category)}
                      onChange={() => setCategoryFilter((s) => toggleInSet(s, category))}
                    />
                    {ANNOUNCEMENT_CATEGORY_LABELS[category]}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Đối tượng xem</p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={audienceFilter.has("ALL_STUDENTS")}
                    onChange={() => setAudienceFilter((s) => toggleInSet(s, "ALL_STUDENTS"))}
                  />
                  Tất cả học viên
                </label>
                {ORDERED_LEVELS.map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={audienceFilter.has(level)}
                      onChange={() => setAudienceFilter((s) => toggleInSet(s, level))}
                    />
                    {LEVEL_LABELS[level]} trở lên
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Công khai</p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={guestFilter.has("public")}
                    onChange={() => setGuestFilter((s) => toggleInSet(s, "public"))}
                  />
                  Công khai cho khách
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={guestFilter.has("private")}
                    onChange={() => setGuestFilter((s) => toggleInSet(s, "private"))}
                  />
                  Không công khai
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Trạng thái</p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={hiddenFilter.has("visible")}
                    onChange={() => setHiddenFilter((s) => toggleInSet(s, "visible"))}
                  />
                  Đang hiển thị
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={hiddenFilter.has("hidden")}
                    onChange={() => setHiddenFilter((s) => toggleInSet(s, "hidden"))}
                  />
                  Đang ẩn
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-lg border border-border py-1.5 text-sm text-muted hover:bg-surface-hover"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {announcements.length === 0
            ? "Chưa có bản tin nào."
            : "Không có bản tin nào khớp với bộ lọc đã chọn."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((announcement) => {
            const hidden = !announcement.visibleToStudents;
            return (
            <li
              key={announcement.id}
              className={`flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary/50 ${
                hidden ? "opacity-60" : ""
              }`}
            >
              <Link
                href={`/admin/announcements/${announcement.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
              >
                <span className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md">
                  {announcement.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={announcement.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-faint-bg">
                      <Megaphone className="h-4 w-4 text-muted" />
                    </span>
                  )}
                  {hidden && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <EyeOff className="h-4 w-4 text-white" />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-foreground">{announcement.title}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge color={ANNOUNCEMENT_CATEGORY_BADGE_COLOR[announcement.category]}>
                      {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
                    </Badge>
                    {announcement.minLevel ? (
                      <Badge color="primary">{LEVEL_LABELS[announcement.minLevel]} trở lên</Badge>
                    ) : (
                      <Badge color="muted">Tất cả học viên</Badge>
                    )}
                    {hidden && <Badge color="warning">Đã ẩn</Badge>}
                    {announcement.visibleToGuest && <Badge color="info">Công khai</Badge>}
                    <span className="text-xs text-muted">{announcement.publishedAtLabel}</span>
                  </span>
                </span>
              </Link>
              <ToggleAnnouncementStudentsVisibilityButton
                announcementId={announcement.id}
                visibleToStudents={announcement.visibleToStudents}
              />
              <ToggleAnnouncementGuestButton
                announcementId={announcement.id}
                visibleToGuest={announcement.visibleToGuest}
              />
              <DeleteAnnouncementInlineButton
                announcementId={announcement.id}
                announcementTitle={announcement.title}
              />
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
