"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { LevelUpRequest, User } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { formatDateTimeVN } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { approveJoinRequestAction } from "./join-requests-actions";
import { RejectForm } from "./reject-form";

type PendingJoinRequest = LevelUpRequest & { student: User };

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
                  <form action={approveJoinRequestAction} className="flex items-center gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <select
                      name="toLevel"
                      defaultValue={request.toLevel}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {ORDERED_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Duyệt
                    </Button>
                  </form>
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
