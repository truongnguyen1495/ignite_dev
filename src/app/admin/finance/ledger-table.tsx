"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { FinanceEntryType } from "@prisma/client";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatVND } from "@/lib/currency";
import type { FinanceLedgerRow } from "@/lib/finance";
import { FINANCE_CATEGORY_LABELS } from "@/lib/finance-labels";
import { deleteFinanceEntryAction } from "./actions";

function isoToDDMM(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

type Filter = "all" | FinanceEntryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "INCOME", label: "Thu" },
  { value: "EXPENSE", label: "Chi" },
];

function RowActions({ entryId, entryNote }: { entryId: string; entryNote: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Xoá giao dịch này?",
      description: (
        <>
          &ldquo;{entryNote}&rdquo; sẽ bị ẩn khỏi sổ thu chi và không tính vào báo cáo nữa. Nếu ghi nhầm, xoá rồi
          thêm lại khoản đúng — không sửa được tại chỗ.
        </>
      ),
      confirmLabel: "Xoá",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteFinanceEntryAction(entryId);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Xoá giao dịch"
      disabled={pending}
      onClick={handleDelete}
      className="hover:bg-danger-bg hover:text-danger"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function LedgerTable({ ledger }: { ledger: FinanceLedgerRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo(() => (filter === "all" ? ledger : ledger.filter((e) => e.type === filter)), [ledger, filter]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Sổ giao dịch</h2>
          <p className="mt-0.5 text-xs text-muted">Các khoản nhập tay trong kỳ đã chọn</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-hover p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {ledger.length === 0 ? "Chưa có khoản nào được nhập trong kỳ này." : "Không có giao dịch nào khớp bộ lọc."}
        </p>
      ) : (
        <Table className="mt-3">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 font-medium">Ngày</th>
              <th className="py-2 font-medium">Loại</th>
              <th className="hidden py-2 font-medium sm:table-cell">Danh mục</th>
              <th className="py-2 font-medium">Ghi chú</th>
              <th className="py-2 text-right font-medium">Số tiền</th>
              <th className="hidden py-2 font-medium md:table-cell">Người tạo</th>
              <th className="w-8 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap py-2.5 pr-2 text-xs tabular-nums text-muted">
                  {isoToDDMM(e.occurredAtISO)}
                </td>
                <td className="py-2.5 pr-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      e.type === "INCOME" ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
                    }`}
                  >
                    {e.type === "INCOME" ? "+ Thu" : "− Chi"}
                  </span>
                </td>
                <td className="hidden py-2.5 pr-3 text-xs text-muted sm:table-cell">
                  {FINANCE_CATEGORY_LABELS[e.category]}
                </td>
                <td className="max-w-[160px] truncate py-2.5 pr-3 text-foreground sm:max-w-[260px]" title={e.note}>
                  {e.note}
                  <span className="block text-[10.5px] text-muted sm:hidden">
                    {FINANCE_CATEGORY_LABELS[e.category]}
                  </span>
                </td>
                <td
                  className={`whitespace-nowrap py-2.5 text-right font-semibold tabular-nums ${
                    e.type === "INCOME" ? "text-success" : "text-danger"
                  }`}
                >
                  {formatVND(e.amount)}
                </td>
                <td className="hidden py-2.5 pl-3 text-xs text-muted md:table-cell">{e.createdByName}</td>
                <td className="py-2.5 pl-1 text-right">
                  <RowActions entryId={e.id} entryNote={e.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-4 flex items-start gap-2 border-t border-dashed border-border pt-3 text-xs text-muted">
        <span>
          Doanh thu bán hàng không hiện ở bảng này để tránh trùng dữ liệu — đã cộng sẵn vào &quot;Tổng thu&quot; ở
          trên, xem chi tiết từng đơn tại{" "}
          <a href="/admin/revenue" className="font-semibold text-primary underline decoration-dotted underline-offset-2">
            trang Doanh thu →
          </a>
        </span>
      </div>
    </div>
  );
}
