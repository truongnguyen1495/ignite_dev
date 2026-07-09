"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, X } from "lucide-react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import {
  grantCourseAccessAction,
  revokeCourseAccessAction,
  grantCourseLevelAccessAction,
  revokeCourseLevelAccessAction,
} from "../actions";

export function GrantAccessForm({
  courseId,
  students,
}: {
  courseId: string;
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
      <button
        type="button"
        disabled={pending || !studentId}
        onClick={() => {
          startTransition(async () => {
            await grantCourseAccessAction(courseId, studentId);
            setStudentId("");
            router.refresh();
          });
        }}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang cấp..." : "Cấp quyền"}
      </button>
    </div>
  );
}

export function RevokeAccessButton({ grantId, courseId }: { grantId: string; courseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      title="Thu hồi quyền truy cập"
      onClick={() => {
        startTransition(async () => {
          await revokeCourseAccessAction(grantId, courseId);
          router.refresh();
        });
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
    >
      <UserMinus className="h-4 w-4" />
    </button>
  );
}

export function GrantLevelAccessForm({ courseId }: { courseId: string }) {
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
      <button
        type="button"
        disabled={pending || !minLevel}
        onClick={() => {
          if (!minLevel) return;
          startTransition(async () => {
            await grantCourseLevelAccessAction(courseId, minLevel);
            setMinLevel("");
            router.refresh();
          });
        }}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang cấp..." : "Cấp quyền theo cấp"}
      </button>
    </div>
  );
}

export function RevokeLevelAccessButton({ grantId, courseId }: { grantId: string; courseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      title="Thu hồi luật cấp"
      onClick={() => {
        startTransition(async () => {
          await revokeCourseLevelAccessAction(grantId, courseId);
          router.refresh();
        });
      }}
      className="flex h-5 w-5 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
