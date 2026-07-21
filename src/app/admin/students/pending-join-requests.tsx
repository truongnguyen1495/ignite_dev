"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { Level, LevelUpRequest, User } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { formatDateOnlyVN, formatDateTimeVN } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { approveJoinRequestAction } from "./join-requests-actions";
import { RejectForm } from "./reject-form";

type PendingJoinRequest = LevelUpRequest & { student: User };

// Duyệt admits a self-registered "học sinh" onto the 5-level roster — a
// one-way action an admin can't casually undo, so it goes through the
// shared confirm dialog with the student's own details spelled out first,
// instead of a bare button that submits on the first tap.
function ApproveJoinRequestForm({ request }: { request: PendingJoinRequest }) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [toLevel, setToLevel] = useState<Level>(request.toLevel ?? ORDERED_LEVELS[0]);

  async function handleApprove() {
    const { student } = request;
    const confirmed = await confirm({
      title: `Duyệt "${student.name}" tham gia hệ thống 5 cấp?`,
      description: (
        <div className="space-y-1 text-left">
          <p>
            <span className="text-muted">Họ tên:</span> {student.name}
          </p>
          <p>
            <span className="text-muted">Email:</span> {student.email}
          </p>
          {student.username && (
            <p>
              <span className="text-muted">Username:</span> @{student.username}
            </p>
          )}
          {student.phoneNumber && (
            <p>
              <span className="text-muted">Số điện thoại:</span> {student.phoneNumber}
            </p>
          )}
          {student.dateOfBirth && (
            <p>
              <span className="text-muted">Ngày sinh:</span> {formatDateOnlyVN(student.dateOfBirth)}
            </p>
          )}
          <p>
            <span className="text-muted">Yêu cầu lúc:</span> {formatDateTimeVN(request.requestedAt)}
          </p>
          <p className="pt-1">
            <span className="text-muted">Sẽ được cấp:</span>{" "}
            <span className="font-medium text-foreground">{LEVEL_LABELS[toLevel]}</span>
          </p>
        </div>
      ),
      confirmLabel: "Duyệt",
      tone: "primary",
    });
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("requestId", request.id);
    formData.set("toLevel", toLevel);
    startTransition(() => {
      void approveJoinRequestAction(formData);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={toLevel}
        onChange={(e) => setToLevel(e.target.value as Level)}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-base sm:text-sm text-foreground focus:border-primary focus:outline-none"
      >
        {ORDERED_LEVELS.map((level) => (
          <option key={level} value={level}>
            {LEVEL_LABELS[level]}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" onClick={handleApprove} isLoading={pending}>
        <CheckCircle2 className="h-4 w-4" />
        Duyệt
      </Button>
    </div>
  );
}

export function PendingJoinRequests({ requests }: { requests: PendingJoinRequest[] }) {
  const [open, setOpen] = useState(requests.length > 0);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          Chờ duyệt tham gia hệ thống đào tạo 5 cấp
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
            {requests.length}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-6 pt-4">
          {requests.length === 0 ? (
            <p className="text-sm text-muted">Không có học sinh nào đang chờ duyệt tham gia.</p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-border border-l-4 border-l-warning p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{request.student.name}</p>
                    <p className="text-sm text-muted">{request.student.email}</p>
                  </div>
                  <Link
                    href={`/admin/students/${request.student.id}`}
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Xem chi tiết
                  </Link>
                </div>

                <p className="mt-2 text-xs text-muted">
                  Yêu cầu lúc {formatDateTimeVN(request.requestedAt)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                  <ApproveJoinRequestForm request={request} />
                  <RejectForm requestId={request.id} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
