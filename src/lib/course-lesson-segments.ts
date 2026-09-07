// Shared by the admin authoring UI (client-side "paste & parse" preview) and
// the server action that persists it (see resolveSegmentsInput below,
// called from both admin/courses/actions.ts and vendor's actions.ts) — one
// implementation so a timestamp that parses in the browser is guaranteed to
// parse the same way when re-validated on the server, and so both sides
// sort/validate identically.

export type ParsedSegment = { time: string; label: string };

// Accepts "m:ss"/"mm:ss"/"h:mm:ss" — the leading component is uncapped in
// digit count (a video past 99 minutes typed as plain "125:47" instead of
// "2:05:47" must still parse), only the trailing mm/ss components are
// bounded to two digits and, per the 0-59 check below, to a valid range.
const TIME_PATTERN = /^\d+(?::\d{1,2}){1,2}$/;

// A ceiling the digit-count of the pattern above no longer provides: without
// it "99999999:00" parses to ~6 billion seconds, overflows the int4 that
// backs CourseLessonSegment.seconds, and surfaces as a raw Prisma crash
// instead of a validation message. 24h is far past the longest video
// YouTube will serve, so no real tracklist can hit it.
const MAX_SEGMENT_SECONDS = 24 * 60 * 60;

export function parseTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  if (!TIME_PATTERN.test(trimmed)) return null;
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isInteger(p) || p < 0) || parts.some((p, i) => i > 0 && p > 59)) return null;
  const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  if (!Number.isSafeInteger(seconds) || seconds > MAX_SEGMENT_SECONDS) return null;
  return seconds;
}

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// One line per segment: a leading timestamp followed by whatever label text
// the video description used ("00:00 Tình Yêu Muôn Thủa – Sáng tác: Đức
// Hữu"). Lines that don't start with a recognizable timestamp are skipped
// rather than rejecting the whole paste — descriptions often have a title
// line or blank lines mixed in above the actual tracklist.
export function parseTracklistText(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  for (const line of raw.split("\n")) {
    const match = line.trim().match(/^(\d+(?::\d{1,2}){1,2})\s+(.+)$/);
    if (!match) continue;
    const [, time, label] = match;
    if (parseTimestamp(time) === null) continue;
    segments.push({ time, label: label.trim() });
  }
  return segments;
}

export type ResolvedSegment = { seconds: number; label: string; order: number };

// Bounds on a payload that reaches this from a vendor as well as an admin —
// the editor UI never produces anything near either, so these only ever fire
// on a crafted request, and rejecting outright (rather than truncating) keeps
// what got saved identical to what the submitter saw.
const MAX_SEGMENTS = 500;
const MAX_LABEL_LENGTH = 300;

// Re-parses (and re-validates) every timestamp server-side rather than
// trusting the client's own parseTracklistText — an admin/vendor can
// freehand-edit a row after parsing, so an out-of-range or malformed value
// has to be caught here, not just in the browser. Shared by both the admin
// and vendor lesson actions (unlike their ownership checks, which stay
// deliberately duplicated per-side — this function does no ownership
// check, it's pure parsing, so duplicating it would only let the two
// copies silently drift).
//
// Sorts by `seconds` ascending before assigning `order`: the submitted
// array order is whatever order rows happen to sit in the editor (parse
// order, or an admin's own edits), which isn't guaranteed to match the
// timestamps themselves once a row is hand-edited — but every consumer
// (the tracklist UI's "which segment is playing" lookup, the scrubber)
// assumes chronological order. Sorting once here, at the only place data
// is persisted, means every reader can stay simple.
// Returns either the rows to write, or { error } carrying a message meant to
// be shown to the author as-is — naming the offending row, because a bad
// timestamp rejects the whole lesson save (title, ghi chú and video along
// with it) and "something in this list is wrong" is useless against 40 rows.
export function resolveSegmentsInput(raw: string | undefined): ResolvedSegment[] | { error: string } {
  if (!raw) return [];
  let items: unknown;
  try {
    items = JSON.parse(raw);
  } catch {
    return { error: "Danh sách phân cảnh không hợp lệ." };
  }
  if (!Array.isArray(items)) return { error: "Danh sách phân cảnh không hợp lệ." };
  if (items.length > MAX_SEGMENTS) return { error: `Tối đa ${MAX_SEGMENTS} phân cảnh cho một bài học.` };

  const parsed: { seconds: number; label: string }[] = [];
  for (const [index, item] of items.entries()) {
    const row = index + 1;
    if (typeof item !== "object" || item === null) return { error: "Danh sách phân cảnh không hợp lệ." };
    const { time, label } = item as { time?: unknown; label?: unknown };
    if (typeof time !== "string" || typeof label !== "string") {
      return { error: "Danh sách phân cảnh không hợp lệ." };
    }
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return { error: `Phân cảnh dòng ${row} chưa có tên bài.` };
    if (trimmedLabel.length > MAX_LABEL_LENGTH) {
      return { error: `Tên phân cảnh dòng ${row} quá dài (tối đa ${MAX_LABEL_LENGTH} ký tự).` };
    }
    const seconds = parseTimestamp(time);
    if (seconds === null) return { error: `Mốc thời gian "${time}" ở dòng ${row} không hợp lệ.` };
    parsed.push({ seconds, label: trimmedLabel });
  }

  return parsed
    .sort((a, b) => a.seconds - b.seconds)
    .map((segment, order) => ({ ...segment, order }));
}
