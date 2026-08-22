"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { FinanceCategory, FinanceEntryType } from "@prisma/client";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { categoriesForType, FINANCE_CATEGORY_LABELS } from "@/lib/finance-labels";
import { createFinanceEntryAction } from "./actions";

const TYPE_OPTIONS: { value: FinanceEntryType; label: string }[] = [
  { value: "EXPENSE", label: "− Chi" },
  { value: "INCOME", label: "+ Thu" },
];

const TYPE_HELPER: Record<FinanceEntryType, string> = {
  EXPENSE:
    "Doanh thu bán hàng tự động cộng vào Thu — không cần nhập tay ở đây, form này chỉ dành cho chi phí phát sinh.",
  INCOME:
    "Chỉ dùng cho khoản thu ngoài bán hàng (lãi ngân hàng, thu hồi nợ...). Doanh thu bán hàng đã tự động cộng vào Tổng thu.",
};

function formatAmountInput(raw: string): string {
  return raw ? Number(raw).toLocaleString("vi-VN") : "";
}

export function AddEntryButton({ todayISO, adminName }: { todayISO: string; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FinanceEntryType>("EXPENSE");
  const [category, setCategory] = useState(categoriesForType("EXPENSE")[0]);
  const [amountDigits, setAmountDigits] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayISO);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const categoryOptions = useMemo(() => categoriesForType(type), [type]);

  function reset() {
    setType("EXPENSE");
    setCategory(categoriesForType("EXPENSE")[0]);
    setAmountDigits("");
    setOccurredAt(todayISO);
    setNote("");
    setError(undefined);
  }

  function openModal() {
    reset();
    setOpen(true);
  }
  function closeModal() {
    if (pending) return;
    setOpen(false);
  }

  function handleTypeChange(nextType: FinanceEntryType) {
    setType(nextType);
    setCategory(categoriesForType(nextType)[0]);
  }

  function submit() {
    setError(undefined);
    const amount = Number(amountDigits);
    if (!amountDigits || amount <= 0) {
      setError("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }
    if (!note.trim()) {
      setError("Vui lòng nhập ghi chú.");
      return;
    }
    startTransition(async () => {
      const result = await createFinanceEntryAction({ type, category, amount, occurredAt, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={openModal}>
        <Plus className="h-4 w-4" />
        Thêm giao dịch
      </Button>

      {open && (
        <ModalShell onClose={closeModal} labelledBy="add-finance-entry-title">
          <h2 id="add-finance-entry-title" className="text-base font-semibold text-foreground">
            {type === "EXPENSE" ? "Thêm khoản chi" : "Thêm khoản thu"}
          </h2>
          <p className="mt-1 text-sm text-muted">Ghi một khoản thu hoặc chi thủ công vào sổ quỹ.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const active = opt.value === type;
              const tone = opt.value === "EXPENSE" ? "danger" : "success";
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value)}
                  className={`rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                    active
                      ? tone === "danger"
                        ? "border-danger-border bg-danger-bg text-danger"
                        : "border-success-border bg-success-bg text-success"
                      : "border-border text-muted hover:bg-surface-hover"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <p className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted">
            {TYPE_HELPER[type]}
          </p>

          <div className="mt-4 space-y-4">
            <Select
              id="entry-category"
              label="Danh mục"
              value={category}
              onChange={(e) => setCategory(e.target.value as FinanceCategory)}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {FINANCE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="entry-amount"
                label="Số tiền (₫)"
                inputMode="numeric"
                placeholder="0"
                value={formatAmountInput(amountDigits)}
                onChange={(e) => setAmountDigits(e.target.value.replace(/\D/g, ""))}
              />
              <Input
                id="entry-date"
                label="Ngày"
                type="date"
                value={occurredAt}
                max={todayISO}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>

            <Textarea
              id="entry-note"
              label="Ghi chú"
              rows={2}
              placeholder="Ví dụ: Thanh toán tiền thuê văn phòng tháng 8"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted">
            Người tạo: <span className="font-medium text-foreground">{adminName}</span> · tự động điền theo tài khoản
            đang đăng nhập
          </p>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={pending}>
              Hủy
            </Button>
            <Button type="button" onClick={submit} isLoading={pending} disabled={pending}>
              Lưu giao dịch
            </Button>
          </div>
        </ModalShell>
      )}
    </>
  );
}
