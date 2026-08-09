"use client";

import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useInstallPrompt } from "@/components/install-app-provider";

// Renders nothing once the app is already running standalone (installed) or
// on a browser that offers no install path at all (desktop Chrome/Edge below
// the manifest icon-size bar, desktop Firefox, pre-Sonoma macOS Safari, ...)
// — Safari (iOS or macOS) has no programmatic install API, so the button
// instead opens a small dialog with the right manual steps for the detected
// browser (see ManualInstallGuide in install-app-provider.tsx).
export function InstallAppButton() {
  const { t } = useLocale();
  const { deferredPrompt, isStandalone, manualInstallGuide, clearDeferredPrompt } = useInstallPrompt();
  const [showManualHelp, setShowManualHelp] = useState(false);

  if (isStandalone || (!deferredPrompt && !manualInstallGuide)) {
    return null;
  }

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      // A BeforeInstallPromptEvent can only be prompted once — clear it
      // regardless of outcome, or a re-click reuses an already-consumed
      // event and throws instead of silently doing nothing.
      clearDeferredPrompt();
      return;
    }
    setShowManualHelp(true);
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
        {t.installApp.button}
      </button>
      {showManualHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => setShowManualHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-manual-title"
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="install-app-manual-title" className="text-base font-semibold text-foreground">
                {manualInstallGuide === "ios-safari"
                  ? t.installApp.iosTitle
                  : manualInstallGuide === "mac-safari"
                    ? t.installApp.macSafariTitle
                    : t.installApp.nonSafariTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowManualHelp(false)}
                aria-label="Đóng"
                className="shrink-0 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {manualInstallGuide === "ios-safari" && (
              <ol className="mt-3 space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t.installApp.iosStep1}
                </li>
                <li>2. {t.installApp.iosStep2}</li>
                <li>3. {t.installApp.iosStep3}</li>
              </ol>
            )}
            {manualInstallGuide === "ios-other" && (
              // Chrome/Firefox/Edge for iOS and in-app webviews (Zalo,
              // Facebook, Messenger, ...) are WebKit too so they still count
              // as an iOS device, but "Add to Home Screen" is a Safari-only
              // Share-sheet action — the steps above don't apply here, so
              // point the user at Safari instead.
              <p className="mt-3 text-sm text-muted">{t.installApp.nonSafariBody}</p>
            )}
            {manualInstallGuide === "mac-safari" && (
              // Safari 17+ on a real (non-touch) Mac — "Add to Dock" lives in
              // the File menu, not the Share sheet, and there's no JS trigger
              // for it either.
              <p className="mt-3 text-sm text-muted">{t.installApp.macSafariBody}</p>
            )}
            <button
              type="button"
              onClick={() => setShowManualHelp(false)}
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
