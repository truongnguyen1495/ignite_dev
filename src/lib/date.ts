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
