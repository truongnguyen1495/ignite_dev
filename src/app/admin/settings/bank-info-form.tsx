"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setBankInfoAction } from "./actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { VIETQR_BANKS } from "@/lib/vietqr-banks";

export function BankInfoForm({
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  bankQrImageUrl,
}: {
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankQrImageUrl: string | null;
}) {
  const [error, formAction, pending] = useActionState(setBankInfoAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  // Controlled (not defaultValue) so the field visibly re-syncs to the
  // fresh server value the instant a save round-trips — an uncontrolled
  // `defaultValue` only applies at first mount, so a save that revalidates
  // this same already-mounted component's props left the <select> quietly
  // showing whatever it displayed before, which looked like the pick
  // hadn't taken effect even though the DB write succeeded. Same
  // "resync local state when the prop actually changes" technique as
  // course-outline-section.tsx's prevChapters/prevLessons tracking.
  const [bankNameValue, setBankNameValue] = useState(bankName ?? "");
  const [prevBankName, setPrevBankName] = useState(bankName);
  if (bankName !== prevBankName) {
    setPrevBankName(bankName);
    setBankNameValue(bankName ?? "");
  }
  const [accountNumberValue, setAccountNumberValue] = useState(bankAccountNumber ?? "");
  const [prevAccountNumber, setPrevAccountNumber] = useState(bankAccountNumber);
  if (bankAccountNumber !== prevAccountNumber) {
    setPrevAccountNumber(bankAccountNumber);
    setAccountNumberValue(bankAccountNumber ?? "");
  }
  const [accountHolderValue, setAccountHolderValue] = useState(bankAccountHolder ?? "");
  const [prevAccountHolder, setPrevAccountHolder] = useState(bankAccountHolder);
  if (bankAccountHolder !== prevAccountHolder) {
    setPrevAccountHolder(bankAccountHolder);
    setAccountHolderValue(bankAccountHolder ?? "");
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Thông tin chuyển khoản</p>
        <p className="text-sm text-muted">
          Hiển thị cho học viên khi tạo đơn mua khóa học/tài liệu — học viên chuyển khoản với nội dung là mã
          đơn hàng, admin vào &quot;Đơn hàng&quot; xác nhận đã nhận tiền để mở khóa.
        </p>
      </div>
      <Select
        id="bankName"
        name="bankName"
        value={bankNameValue}
        onChange={(e) => {
          setBankNameValue(e.target.value);
          setIsDirty(true);
        }}
        label="Tên ngân hàng"
      >
        <option value="">— Chọn ngân hàng —</option>
        {VIETQR_BANKS.map((bank) => (
          <option key={bank.label} value={bank.label}>
            {bank.label}
          </option>
        ))}
      </Select>
      <p className="-mt-2 text-xs text-muted">
        Chọn đúng ngân hàng để hệ thống có thể sinh mã QR động (kèm sẵn số tiền + nội dung) cho từng đơn hàng.
      </p>
      <Input
        id="bankAccountNumber"
        name="bankAccountNumber"
        value={accountNumberValue}
        onChange={(e) => {
          setAccountNumberValue(e.target.value);
          setIsDirty(true);
        }}
        label="Số tài khoản"
      />
      <Input
        id="bankAccountHolder"
        name="bankAccountHolder"
        value={accountHolderValue}
        onChange={(e) => {
          setAccountHolderValue(e.target.value);
          setIsDirty(true);
        }}
        label="Chủ tài khoản"
      />
      <CoverImageInput
        name="bankQrImageUrl"
        label="Ảnh mã QR chuyển khoản (tùy chọn)"
        alt="Mã QR chuyển khoản"
        defaultValue={bankQrImageUrl ?? ""}
        onChange={() => setIsDirty(true)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu thông tin chuyển khoản" : "Đã lưu"}
      </Button>
    </form>
  );
}
