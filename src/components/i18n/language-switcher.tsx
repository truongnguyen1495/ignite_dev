"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLocale } from "./locale-provider";

// Hidden whenever bilingualEnabled is off — the DB-level flag is the single
// source of truth, so this never needs its own separate visibility prop.
export function LanguageSwitcher() {
  const { locale, setLocale, bilingualEnabled, t } = useLocale();
  const router = useRouter();

  if (!bilingualEnabled) {
    return null;
  }

  function toggle() {
    setLocale(locale === "vi" ? "en" : "vi");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={locale === "vi" ? t.common.switchToEnglish : t.common.switchToVietnamese}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <Languages className="h-3.5 w-3.5" />
      {locale === "vi" ? "EN" : "VI"}
    </button>
  );
}
