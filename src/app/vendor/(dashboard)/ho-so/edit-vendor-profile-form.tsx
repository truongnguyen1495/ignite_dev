"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateVendorProfileAction } from "./actions";
import { CoverImageInput } from "@/components/ui/cover-image-input";
import { CopyField } from "@/components/ui/copy-field";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function EditVendorProfileForm({
  slug,
  shopName,
  logoUrl,
  bio,
  contactEmail,
  contactPhone,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
}: {
  slug: string;
  shopName: string;
  logoUrl: string | null;
  bio: string | null;
  contactEmail: string;
  contactPhone: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}) {
  const [error, formAction, pending] = useActionState(updateVendorProfileAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setIsDirty(false);
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Thông tin gian hàng</h2>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <CopyField label="Đường dẫn gian hàng" value={`/shop/${slug}`} mono />
        </div>
        <a
          href={`/shop/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover"
        >
          Xem gian hàng →
        </a>
      </div>

      <Input id="shopName" name="shopName" defaultValue={shopName} required label="Tên gian hàng" />
      <CoverImageInput
        name="logoUrl"
        alt="Logo gian hàng"
        label="Logo gian hàng (tùy chọn)"
        defaultValue={logoUrl ?? ""}
        onChange={() => setIsDirty(true)}
        enforceRatio={false}
        uploadUrl="/api/vendor/upload-image"
      />
      <Textarea id="bio" name="bio" rows={3} defaultValue={bio ?? ""} label="Giới thiệu ngắn (hiển thị công khai)" />
      <div className="grid grid-cols-2 gap-4">
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={contactEmail} required label="Email liên hệ công khai" />
        <Input id="contactPhone" name="contactPhone" defaultValue={contactPhone} required label="Số điện thoại công khai" />
      </div>
      <p className="text-xs text-muted">Khách mua hàng vật lý sẽ liên hệ trực tiếp qua đây nếu cần đổi/trả.</p>

      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Tài khoản nhận hoa hồng</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input id="bankName" name="bankName" defaultValue={bankName ?? ""} label="Ngân hàng" />
          <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={bankAccountNumber ?? ""} label="Số tài khoản" />
        </div>
        <Input id="bankAccountHolder" name="bankAccountHolder" defaultValue={bankAccountHolder ?? ""} label="Chủ tài khoản" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" variant={isDirty ? "primary" : "secondary"} disabled={pending || !isDirty} isLoading={pending}>
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </Button>
      </div>
    </form>
  );
}
