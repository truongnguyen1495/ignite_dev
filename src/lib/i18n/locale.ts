export type Locale = "vi" | "en";

export const DEFAULT_LOCALE: Locale = "vi";

// Read client-side via document.cookie and server-side via next/headers'
// cookies() — kept in sync manually rather than through a Server Action,
// since "cookie theo trình duyệt" (no account sync) means the browser is the
// only writer.
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "vi" || value === "en";
}
