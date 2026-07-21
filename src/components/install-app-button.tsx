"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

// Not in lib.dom.d.ts — Chrome/Edge/Samsung Internet fire this before their
// native "install this site" mini-infobar, letting us trigger it from our
// own button instead. iOS Safari and Firefox never fire it (see isIos below).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Renders nothing once the app is already running standalone (installed) or
// on a browser that offers no install path at all (desktop Firefox, etc.) —
// on iOS Safari there's no programmatic install API, so the button instead
// opens a small dialog with the manual "Share → Add to Home Screen" steps.
export function InstallAppButton() {
  const { t } = useLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIsIos(/iphone|ipad|ipod/i.test(nav.userAgent));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone || (!deferredPrompt && !isIos)) {
    return null;
  }

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={t.installApp.button}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t.installApp.button}</span>
      </button>
      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-ios-title"
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="install-app-ios-title" className="text-base font-semibold text-foreground">
                {t.installApp.iosTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                aria-label="Đóng"
                className="shrink-0 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t.installApp.iosStep1}
              </li>
              <li>2. {t.installApp.iosStep2}</li>
              <li>3. {t.installApp.iosStep3}</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t.installApp.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
