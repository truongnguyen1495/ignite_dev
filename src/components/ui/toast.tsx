"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { PartyPopper, X } from "lucide-react";

type Toast = {
  id: number;
  title: string;
  description?: string;
};

type ToastFn = (toast: { title: string; description?: string }) => void;

const ToastContext = createContext<ToastFn | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const celebrate = useCallback<ToastFn>(
    ({ title, description }) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, description }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={celebrate}>
      {children}
      {/* Only mounted while a toast actually exists, and sized to its own
          content (not a full-viewport-width strip) — a permanently-present,
          screen-wide band pinned above the header relied solely on
          pointer-events-none to stay click-through, and at least one
          content-blocker extension has been observed stripping that
          property on fixed/high-z-index bars like this, turning empty
          space into a dead zone over whatever sits underneath it (here,
          the sidebar toggle and language switcher in the header). Not
          existing in the DOM at all when there's nothing to show removes
          the dead zone regardless of what a browser extension does to it. */}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-accent/40 bg-surface p-4 shadow-lg"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent">
                <PartyPopper className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Đóng"
                className="shrink-0 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useCelebrate(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useCelebrate must be used within a ToastProvider");
  }
  return ctx;
}
