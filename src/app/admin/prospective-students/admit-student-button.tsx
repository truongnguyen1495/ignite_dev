"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle } from "lucide-react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { admitProspectiveStudentAction } from "../students/join-requests-actions";

// Lets an admin admit any học sinh into the 5-level Học viên roster
// directly from the prospective-students list, without requiring them to
// have submitted a "tham gia hệ thống" request first — the existing
// pending-request queue on /admin/students still covers that case.
export function AdmitStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [toLevel, setToLevel] = useState<Level>(ORDERED_LEVELS[0]);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleConfirm() {
    const confirmed = await confirm({
      title: `Cho "${studentName}" tham gia hệ thống 5 cấp?`,
      description: (
        <p>
          Sẽ được cấp: <span className="font-medium text-foreground">{LEVEL_LABELS[toLevel]}</span>
        </p>
      ),
      confirmLabel: "Xác nhận",
      tone: "primary",
    });
    if (!confirmed) return;

    startTransition(async () => {
      await admitProspectiveStudentAction(studentId, toLevel);
      router.refresh();
    });
    setOpen(false);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Cho tham gia hệ thống học viên"
        disabled={pending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary-bg hover:text-primary disabled:opacity-50"
      >
        <ArrowUpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <label className="block space-y-1 text-xs">
            <span className="text-muted">Cấp cho tham gia</span>
            <select
              value={toLevel}
              onChange={(e) => setToLevel(e.target.value as Level)}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-base sm:text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {ORDERED_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "..." : "Xác nhận"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
