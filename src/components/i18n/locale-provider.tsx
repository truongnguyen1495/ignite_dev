"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";

type LocaleContextValue = {
  locale: Locale;
  t: Dictionary;
  bilingualEnabled: boolean;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

// initialLocale/bilingualEnabled come from the server (cookie + Settings row
// read in the root layout) so first paint already matches — this only takes
// over for instant client-side switching afterward. The cookie is the only
// source of truth for "which language" (no DB sync, per product decision),
// so setLocale writes it directly with document.cookie rather than going
// through a Server Action.
export function LocaleProvider({
  initialLocale,
  bilingualEnabled,
  children,
}: {
  initialLocale: Locale;
  bilingualEnabled: boolean;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  // Tracks the initialLocale we last synced from, so a router.refresh() that
  // re-runs the root layout with a freshly-read cookie value updates local
  // state too — the provider itself doesn't remount, so a plain useState
  // initial value wouldn't pick that up. Adjusting state during render (the
  // React-recommended pattern for "derive state from a changed prop") avoids
  // the extra render pass an effect-based sync would cause.
  const [syncedLocale, setSyncedLocale] = useState(initialLocale);
  if (initialLocale !== syncedLocale) {
    setSyncedLocale(initialLocale);
    setLocaleState(initialLocale);
  }

  function setLocale(next: Locale) {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <LocaleContext.Provider value={{ locale, t: dictionaries[locale], bilingualEnabled, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
