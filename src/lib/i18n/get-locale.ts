import "server-only";
import { cookies } from "next/headers";
import { isBilingualEnabled } from "@/lib/access";
import { dictionaries, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";

// Resolves the locale to render this request in. Always "vi" when the
// feature is off — even if a stale cookie says "en" from before a Super
// Admin disabled it — since the switcher itself is hidden in that state and
// nothing should render English behind the visitor's back.
export async function getLocale(): Promise<{ locale: Locale; bilingualEnabled: boolean }> {
  const bilingualEnabled = await isBilingualEnabled();
  if (!bilingualEnabled) {
    return { locale: DEFAULT_LOCALE, bilingualEnabled };
  }
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return { locale: isLocale(raw) ? raw : DEFAULT_LOCALE, bilingualEnabled };
}

export async function getDictionary(): Promise<{
  locale: Locale;
  bilingualEnabled: boolean;
  t: Dictionary;
}> {
  const { locale, bilingualEnabled } = await getLocale();
  return { locale, bilingualEnabled, t: dictionaries[locale] };
}
