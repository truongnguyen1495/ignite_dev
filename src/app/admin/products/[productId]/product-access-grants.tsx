"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus, X } from "lucide-react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  grantProductAccessAction,
  revokeProductAccessAction,
  grantProductLevelAccessAction,
  revokeProductLevelAccessAction,
} from "../actions";

// Mirrors src/app/admin/courses/[courseId]/access-grants.tsx — same two
// grant mechanisms (per-student exception list + "Level >= minLevel" rule),
// just against ProductAccessGrant/ProductLevelGrant instead of the Course
// tables. No orderInfo on revoke here (unlike RevokeAccessButton for
// courses): a ProductAccessGrant is never created from a paid order, always
// an explicit admin action, so there's nothing extra to warn about.
export function GrantProductAccessForm({
  productId,
  students,
}: {
  productId: string;
  students: { id: string; name: string; email: string }[];
}) {
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          Chọn thành viên...
        </option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} ({student.email})
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        disabled={pending || !studentId}
        isLoading={pending}
        onClick={() => {
          startTransition(async () => {
            await grantProductAccessAction(productId, studentId);
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

export function RevokeProductAccessButton({
  grantId,
  productId,
  studentName,
}: {
  grantId: string;
  productId: string;
  studentName?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      title="Thu hồi quyền xem"
      onClick={async () => {
        const ok = await confirm({
          title: `Thu hồi quyền của ${studentName ?? "thành viên này"}?`,
          confirmLabel: "Thu hồi",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await revokeProductAccessAction(grantId, productId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
    </Button>
  );
}

export function GrantProductLevelAccessForm({ productId }: { productId: string }) {
  const [minLevel, setMinLevel] = useState<Level | "">("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        variant="secondary"
        disabled={pending || !minLevel}
        isLoading={pending}
        onClick={() => {
          if (!minLevel) return;
          startTransition(async () => {
            await grantProductLevelAccessAction(productId, minLevel);
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

export function RevokeProductLevelAccessButton({ grantId, productId }: { grantId: string; productId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      title="Thu hồi luật cấp"
      onClick={() => {
        startTransition(async () => {
          await revokeProductLevelAccessAction(grantId, productId);
          router.refresh();
        });
      }}
      className="flex h-5 w-5 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
