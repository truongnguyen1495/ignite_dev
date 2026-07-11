// Date-only values (e.g. dateOfBirth) are stored as UTC midnight for the
// calendar date. Never format them with Date#toLocaleDateString or the
// local getters (getDate/getMonth/getFullYear) — those read the server's
// local timezone and can roll the day forward/backward depending on where
// the process runs. Always go through the UTC getters instead.

export function formatDateOnlyVN(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toDateOnlyISOString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Real timestamps (createdAt, requestedAt, attemptedAt, publishedAt, chat
// message times...) — unlike dateOfBirth above, these carry a real
// time-of-day and must be shown in Vietnam's clock, not whatever timezone
// the server process happens to run in. `Date#toLocaleString("vi-VN")`
// without an explicit `timeZone` uses the runtime's local zone: on Vercel
// that's UTC, 7 hours behind Asia/Ho_Chi_Minh, which can also shift the
// displayed calendar date near midnight VN time. Always go through these
// helpers instead of calling toLocaleString/toLocaleDateString/
// toLocaleTimeString("vi-VN") directly on a Date.
const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatDateTimeVN(date: Date): string {
  return date.toLocaleString("vi-VN", { timeZone: VN_TIME_ZONE });
}

export function formatDateVN(date: Date): string {
  return date.toLocaleDateString("vi-VN", { timeZone: VN_TIME_ZONE });
}

export function formatTimeVN(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: VN_TIME_ZONE,
  });
}
