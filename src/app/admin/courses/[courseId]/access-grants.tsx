"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { grantCourseAccessAction, revokeCourseAccessAction } from "../actions";

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
