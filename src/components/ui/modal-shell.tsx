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
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
