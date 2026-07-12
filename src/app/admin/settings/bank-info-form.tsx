"use client";

import { useActionState } from "react";
import { setBankInfoAction } from "./actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Thông tin chuyển khoản</p>
        <p className="text-sm text-muted">
          Hiển thị cho học viên khi tạo đơn mua khóa học/tài liệu — học viên chuyển khoản với nội dung là mã
          đơn hàng, admin vào &quot;Đơn hàng&quot; xác nhận đã nhận tiền để mở khóa.
        </p>
      </div>
      <Input id="bankName" name="bankName" defaultValue={bankName ?? ""} label="Tên ngân hàng" />
      <Input
        id="bankAccountNumber"
        name="bankAccountNumber"
        defaultValue={bankAccountNumber ?? ""}
        label="Số tài khoản"
      />
      <Input
        id="bankAccountHolder"
        name="bankAccountHolder"
        defaultValue={bankAccountHolder ?? ""}
        label="Chủ tài khoản"
      />
      <CoverImageInput
        name="bankQrImageUrl"
        label="Ảnh mã QR chuyển khoản (tùy chọn)"
        alt="Mã QR chuyển khoản"
        defaultValue={bankQrImageUrl ?? ""}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang lưu..." : "Lưu thông tin chuyển khoản"}
      </Button>
    </form>
  );
}
