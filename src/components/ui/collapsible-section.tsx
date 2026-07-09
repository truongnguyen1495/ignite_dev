"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const VARIANT_STYLES: Record<"light" | "dark", { title: string; icon: string }> = {
  light: { title: "text-muted", icon: "text-muted" },
  dark: { title: "text-dark-muted", icon: "text-dark-muted" },
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  variant = "light",
  children,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  variant?: "light" | "dark";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = VARIANT_STYLES[variant];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        {typeof title === "string" ? (
          <h2 className={`text-sm font-semibold ${styles.title}`}>{title}</h2>
        ) : (
          title
        )}
        {open ? (
          <ChevronUp className={`h-4 w-4 ${styles.icon}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${styles.icon}`} />
        )}
      </button>
      {open && children}
    </div>
  );
}
