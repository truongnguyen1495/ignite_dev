"use client";

import { useEffect, type ReactNode } from "react";

// The dialog frame shared by the app's bespoke modals — the ones that need a
// real form inside (type-to-confirm, rename, pick-one-of-two) rather than the
// yes/no question ConfirmDialogProvider already answers. Deliberately the
// same overlay/panel styling as confirm-dialog.tsx so the two never read as
// two different dialog systems.
export function ModalShell({
  children,
  onClose,
  labelledBy,
  wide = false,
  scrollable = false,
  closeOnBackdrop = true,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  /** For dialogs that hold a table or a multi-step flow (default is a compact form width). */
  wide?: boolean;
  /** Cap the height to the screen and scroll inside, for forms taller than a phone. Off by default so existing dialogs keep clipping nothing. */
  scrollable?: boolean;
  /** Set false for a multi-step flow where a stray click outside would throw away the admin's choices. */
  closeOnBackdrop?: boolean;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={closeOnBackdrop ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full rounded-xl border border-border bg-surface p-6 shadow-lg ${wide ? "max-w-3xl" : "max-w-md"} ${
          scrollable ? "max-h-[calc(100dvh-2rem)] overflow-y-auto" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
