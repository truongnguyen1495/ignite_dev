"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { setBilingualEnabledAction } from "./actions";

export function LanguageToggle({ bilingualEnabled }: { bilingualEnabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{t.settingsPage.bilingualTitle}</p>
        <p className="text-sm text-muted">{t.settingsPage.bilingualDescription}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={bilingualEnabled}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await setBilingualEnabledAction(!bilingualEnabled);
            router.refresh();
          });
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          bilingualEnabled ? "bg-primary" : "bg-border"
        }`}
      >
        {pending ? (
          <Loader2 className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 animate-spin text-primary-foreground" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              bilingualEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}
