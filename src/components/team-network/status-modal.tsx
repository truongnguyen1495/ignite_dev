"use client";

import { useId, useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import {
  NETWORK_STATUS_CONFIG,
  NETWORK_STATUS_NEEDS_REASON,
  NETWORK_STATUS_ORDER,
  type NetworkStatus,
} from "@/lib/network-status";
import type { NetworkMemberLite } from "@/lib/network-tree";
import { StatusPill, idLabel } from "./network-ui";

export type StatusChange = { toStatus: NetworkStatus; effectiveDate: string; reason: string | null };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Changing a status always writes a history row, so this is the only way to do
// it. The effective date may be back-dated, but not before the previous change
// (it would put the timeline out of order with the current status) and never
// in the future. `earliest` is only known once the member's history has loaded;
// the server enforces the same rule either way.
export function StatusModal({
  member,
  todayISO,
  earliest,
  historyReady,
  onSubmit,
  onClose,
}: {
  member: NetworkMemberLite;
  todayISO: string;
  /** Date of the member's latest status change, once their history has loaded. */
  earliest: string | null;
  /** The member's history has finished loading (or failed to, in which case the server still enforces the date). */
  historyReady: boolean;
  onSubmit: (change: StatusChange) => void;
  onClose: () => void;
}) {
  const uid = useId();
  const choices = NETWORK_STATUS_ORDER.filter((s) => s !== member.status);
  const [toStatus, setToStatus] = useState<NetworkStatus>(choices[0]);
  const [effectiveDate, setEffectiveDate] = useState(todayISO);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  const reasonRequired = NETWORK_STATUS_NEEDS_REASON[toStatus];

  function submit() {
    if (!effectiveDate) return setError("Hãy chọn ngày hiệu lực.");
    if (effectiveDate > todayISO) return setError("Ngày hiệu lực không được ở tương lai.");
    if (earliest && effectiveDate < earliest) {
      return setError(`Ngày hiệu lực không được sớm hơn lần đổi gần nhất (${formatDate(earliest)}).`);
    }
    if (reasonRequired && !reason.trim()) return setError("Hãy nhập lý do cho thay đổi này.");
    onSubmit({ toStatus, effectiveDate, reason: reason.trim() || null });
  }

  return (
    <ModalShell onClose={onClose} labelledBy={`${uid}-title`} scrollable>
      <h2 id={`${uid}-title`} className="text-base font-semibold text-foreground">
        Đổi trạng thái thành viên
      </h2>

      {/* noValidate: the date input has min/max, and without it the browser blocks the
          submit with its own tooltip (in the browser's language) before our
          message, which also explains what the earliest allowed date is, can show. */}
      <form
        noValidate
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">{member.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{idLabel(member.igniteId)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            Hiện tại <StatusPill status={member.status} />
          </div>
        </div>

        <Select
          id={`${uid}-to`}
          label="Trạng thái mới"
          value={toStatus}
          onChange={(e) => setToStatus(e.target.value as NetworkStatus)}
        >
          {choices.map((s) => (
            <option key={s} value={s}>
              {NETWORK_STATUS_CONFIG[s].label}
            </option>
          ))}
        </Select>

        <Input
          id={`${uid}-date`}
          type="date"
          label="Ngày hiệu lực"
          value={effectiveDate}
          min={earliest ?? undefined}
          max={todayISO}
          onChange={(e) => setEffectiveDate(e.target.value)}
          hint={earliest ? `Không sớm hơn lần đổi gần nhất (${formatDate(earliest)}) và không ở tương lai.` : "Không ở tương lai."}
        />

        <Textarea
          id={`${uid}-reason`}
          label={reasonRequired ? "Lý do (bắt buộc với trạng thái này)" : "Lý do (không bắt buộc)"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ví dụ: Đủ tiêu chuẩn Leader."
        />

        {error && (
          <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={!historyReady}>
            {historyReady ? "Xác nhận" : "Đang tải lịch sử…"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
