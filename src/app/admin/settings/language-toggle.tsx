"use client";

import { useState } from "react";

export function LanguageToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Song ngữ (Tiếng Việt - English)</p>
        <p className="text-sm text-muted">
          Cho phép học viên và admin chuyển đổi giao diện giữa tiếng Việt và tiếng Anh.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((v) => !v)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
