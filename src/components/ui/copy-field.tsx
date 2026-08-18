"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A labelled value with a copy button — built for the bank details on the
 * payment screen, where the account number and the transfer note are the
 * only two things a buyer has to retype by hand. Getting the note wrong is
 * what stops SePay's webhook from matching the transfer back to the order,
 * which turns an automatic confirmation into a manual reconciliation, so
 * this is a correctness feature as much as a convenience.
 *
 * `highlight` marks the transfer note: it's the one field where a typo has
 * consequences, and it reads as the most important thing in the block.
 */
export function CopyField({
  label,
  value,
  highlight = false,
  mono = true,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The timeout outlives a fast unmount otherwise, and setState on an
  // unmounted component is a warning nobody needs on a payment screen.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access can be refused (insecure origin, permission
      // denied). The value is on screen either way, so failing silently is
      // better than an error the buyer can do nothing about — but don't
      // claim success.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
        highlight ? "border-primary-border bg-primary-bg-subtle" : "border-border bg-surface"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span
          className={`block truncate font-semibold ${mono ? "font-mono" : ""} ${
            highlight ? "text-base text-primary" : "text-sm text-foreground"
          }`}
        >
          {value}
        </span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép ${label}`}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          copied
            ? "border-success-border bg-success-bg text-success"
            : "border-border-strong text-foreground hover:bg-surface-hover"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Đã chép" : "Chép"}
      </button>
    </div>
  );
}
