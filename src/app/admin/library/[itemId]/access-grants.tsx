"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, X } from "lucide-react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import {
  grantLibraryAccessAction,
  revokeLibraryAccessAction,
  grantLibraryLevelAccessAction,
  revokeLibraryLevelAccessAction,
} from "../actions";

export function GrantAccessForm({
  libraryItemId,
  students,
}: {
  libraryItemId: string;
  students: { id: string; name: string; email: string }[];
}) {
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          Chọn học viên...
        </option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} ({student.email})
          </option>
        ))}
      </select>
      <Button
        type="button"
        disabled={pending || !studentId}
        isLoading={pending}
        onClick={() => {
          startTransition(async () => {
            await grantLibraryAccessAction(libraryItemId, studentId);
            setStudentId("");
            router.refresh();
          });
        }}
      >
        {pending ? "Đang cấp..." : "Cấp quyền"}
      </Button>
    </div>
  );
}

export function RevokeAccessButton({ grantId, libraryItemId }: { grantId: string; libraryItemId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Thu hồi quyền truy cập"
      onClick={() => {
        startTransition(async () => {
          await revokeLibraryAccessAction(grantId, libraryItemId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      <UserMinus className="h-4 w-4" />
    </Button>
  );
}

export function GrantLevelAccessForm({ libraryItemId }: { libraryItemId: string }) {
  const [minLevel, setMinLevel] = useState<Level | "">("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <select
        value={minLevel}
        onChange={(e) => setMinLevel(e.target.value as Level)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          Chọn cấp...
        </option>
        {ORDERED_LEVELS.map((level) => (
          <option key={level} value={level}>
            {LEVEL_LABELS[level]} trở lên
          </option>
        ))}
      </select>
      <Button
        type="button"
        disabled={pending || !minLevel}
        isLoading={pending}
        onClick={() => {
          if (!minLevel) return;
          startTransition(async () => {
            await grantLibraryLevelAccessAction(libraryItemId, minLevel);
            setMinLevel("");
            router.refresh();
          });
        }}
      >
        {pending ? "Đang cấp..." : "Cấp quyền theo cấp"}
      </Button>
    </div>
  );
}

export function RevokeLevelAccessButton({
  grantId,
  libraryItemId,
}: {
  grantId: string;
  libraryItemId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      title="Thu hồi luật cấp"
      onClick={() => {
        startTransition(async () => {
          await revokeLibraryLevelAccessAction(grantId, libraryItemId);
          router.refresh();
        });
      }}
      className="flex h-5 w-5 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
