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
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-accent/40 bg-surface p-4 shadow-lg"
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
