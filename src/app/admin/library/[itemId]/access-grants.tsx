"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus, X } from "lucide-react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatOrderCode } from "@/lib/orders";
import {
  grantLibraryAccessAction,
  revokeLibraryAccessAction,
  grantLibraryLevelAccessAction,
  revokeLibraryLevelAccessAction,
  setLibraryItemOpenToProspectiveStudentsAction,
} from "../actions";

export function GrantAccessForm({
  libraryItemId,
  students,
  placeholder = "Chọn học viên...",
  submitLabel = "Cấp quyền",
}: {
  libraryItemId: string;
  students: { id: string; name: string; email: string }[];
  placeholder?: string;
  submitLabel?: string;
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
          {placeholder}
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
        {pending ? "Đang cấp..." : submitLabel}
      </Button>
    </div>
  );
}

export function ToggleOpenToProspectiveStudents({
  libraryItemId,
  open,
}: {
  libraryItemId: string;
  open: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium text-foreground">Mở cho tất cả học sinh (chưa xếp cấp)</p>
        <p className="text-xs text-muted">
          Bật lên: mọi tài khoản học sinh, kể cả đăng ký sau này, đều tự động xem được mục này — không cần
          cấp quyền từng người.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await setLibraryItemOpenToProspectiveStudentsAction(libraryItemId, !open);
            router.refresh();
          });
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          open ? "bg-primary" : "bg-border"
        }`}
      >
        {pending ? (
          <Loader2 className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 animate-spin text-primary-foreground" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              open ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}

export type RevokeOrderInfo = { orderNumber: number; amountLabel: string; paidAtLabel: string };

export function RevokeAccessButton({
  grantId,
  libraryItemId,
  studentName,
  orderInfo,
}: {
  grantId: string;
  libraryItemId: string;
  studentName?: string;
  orderInfo?: RevokeOrderInfo | null;
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
      title="Thu hồi quyền truy cập"
      onClick={async () => {
        const ok = await confirm({
          title: `Thu hồi quyền của ${studentName ?? "học viên này"}?`,
          description: orderInfo ? (
            <>
              Học viên này đã mua qua đơn{" "}
              <span className="font-medium text-foreground">{formatOrderCode(orderInfo.orderNumber)}</span> (
              {orderInfo.amountLabel}
              {orderInfo.paidAtLabel ? `, thanh toán ${orderInfo.paidAtLabel}` : ""}). Thu hồi sẽ{" "}
              <span className="font-semibold text-danger">không</span> tự hủy hay hoàn tiền đơn hàng đó.
            </>
          ) : undefined,
          confirmLabel: "Thu hồi",
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await revokeLibraryAccessAction(grantId, libraryItemId);
          router.refresh();
        });
      }}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
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
