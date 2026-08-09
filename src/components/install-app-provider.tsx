"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Not in lib.dom.d.ts — Chrome/Edge/Samsung Internet fire this before their
// native "install this site" mini-infobar, letting us trigger it from our
// own button instead. No Safari version (iOS or macOS) and no Firefox ever
// fires it — see ManualInstallGuide below for those.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Browsers/OSes with a *manual* install path but no beforeinstallprompt API
// to trigger it from our own button — each needs different on-screen steps:
//   - "ios-safari": Safari on iPhone/iPad → Share sheet → Add to Home Screen.
//   - "ios-other": an iPhone/iPad, but not real Safari (Chrome/Firefox/Edge
//     for iOS, or an in-app webview like Zalo/Facebook/Messenger). All of
//     these are WebKit too (Apple mandates it), so they look like iOS Safari
//     by user-agent, but "Add to Home Screen" is wired up by Safari itself
//     into its own Share sheet — it's not a system feature other iOS apps
//     can opt into, so their share sheets don't have it. Point the user at
//     Safari instead of showing steps that don't apply to their browser.
//   - "mac-safari": real Safari 17+ on a non-touch Mac → File menu → Add to
//     Dock (macOS Sonoma, Sept 2023). Older Safari doesn't have this at all,
//     hence the version gate in the detection below.
//   - null: no known manual path (desktop Chrome/Edge before the manifest
//     icons qualified, desktop Firefox, pre-Sonoma macOS Safari, ...).
type ManualInstallGuide = "ios-safari" | "ios-other" | "mac-safari" | null;

type InstallPromptContextValue = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  manualInstallGuide: ManualInstallGuide;
  clearDeferredPrompt: () => void;
};

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

function detectManualInstallGuide(nav: Navigator): ManualInstallGuide {
  const ua = nav.userAgent;
  // iPadOS 13+ sends a desktop-Safari user agent by default (no "ipad"
  // substring) — a touch-capable "MacIntel" is the standard tell for an iPad
  // masquerading as a Mac.
  const isIpadOs = nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
  const isIosDevice = /iphone|ipad|ipod/i.test(ua) || isIpadOs;
  // A non-touch "MacIntel" that isn't the iPad case above — i.e. an actual
  // Mac, not a touch device pretending to be one.
  const isMacDesktop = nav.platform === "MacIntel" && !isIpadOs;
  // Real Safari (iOS or macOS): UA contains "Safari" and none of the other
  // engines/browsers that also carry that token for legacy compat, or the
  // known in-app webview identifiers. Can't enumerate every embedded webview
  // that exists, so anything not matched here is assumed to be real Safari.
  const isRealSafari =
    /safari/i.test(ua) &&
    !/crios|fxios|edgios|edg\/|opios|opt\/|opr\/|firefox|chrome|chromium|fban|fbav|instagram|line\/|micromessenger|duckduckgo/i.test(
      ua
    );

  if (isIosDevice) {
    return isRealSafari ? "ios-safari" : "ios-other";
  }
  if (isMacDesktop && isRealSafari) {
    // "Add to Dock" shipped in Safari 17 (macOS Sonoma) — gate on the
    // Safari version token so older macOS doesn't get pointed at a File
    // menu item it doesn't have.
    const versionMatch = /version\/(\d+)/i.exec(ua);
    const safariVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
    if (safariVersion >= 17) {
      return "mac-safari";
    }
  }
  return null;
}

// Mounted once in the root layout — deliberately *not* inside the
// guest/dashboard/admin layouts that render <InstallAppButton>. Those three
// are separate route trees that unmount/remount on navigation between them
// (e.g. a guest logging in and landing on /dashboard), and beforeinstallprompt
// only fires once per page load. Keeping the captured event here, above all
// three, means it survives that navigation instead of being lost with
// whichever layout happened to be mounted when the browser fired it.
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Bundled into one object (one setState call) rather than separate useState
  // pairs — both values are only ever known client-side, so they start at
  // their SSR-safe defaults and are detected together, once, right after
  // mount (before that, isStandalone defaults true so nothing renders and
  // the client's first hydration pass matches the server's).
  const [env, setEnv] = useState<{ isStandalone: boolean; manualInstallGuide: ManualInstallGuide }>({
    isStandalone: true,
    manualInstallGuide: null,
  });

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    // One-time client-only environment read deferred past hydration, not
    // syncing an external store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({
      isStandalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
      manualInstallGuide: detectManualInstallGuide(nav),
    });

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setEnv((prev) => ({ ...prev, isStandalone: true }));
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return (
    <InstallPromptContext.Provider
      value={{
        deferredPrompt,
        isStandalone: env.isStandalone,
        manualInstallGuide: env.manualInstallGuide,
        clearDeferredPrompt: () => setDeferredPrompt(null),
      }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error("useInstallPrompt must be used within an InstallPromptProvider");
  }
  return ctx;
}
