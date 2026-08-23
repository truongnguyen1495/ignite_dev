"use client";

import { useActionState } from "react";
import { registerVendorAction, type VendorRegisterState } from "./actions";
import { Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const CHECK_CLASS = "h-4 w-4 accent-primary";

export function VendorRegisterForm({
  mode,
  defaultContactEmail,
  defaultContactPhone,
}: {
  // "new" = anonymous visitor, no account yet — the form also collects
  // account fields (name/password) and creates a User alongside the Vendor.
  // "existing" = an already-logged-in active student — only the Vendor row
  // is created, attached to their existing userId.
  mode: "new" | "existing";
  defaultContactEmail: string;
  defaultContactPhone: string;
}) {
  const [state, formAction, pending] = useActionState<VendorRegisterState, FormData>(registerVendorAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6 sm:p-7">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Gửi hồ sơ đăng ký</h2>
        <p className="mt-1 text-sm text-muted">Đội ngũ RapidX xét duyệt trong 1–2 ngày làm việc qua email.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="shopName" name="shopName" required label="Tên gian hàng" placeholder="VD: Gốm Bát Tràng An" />
        {mode === "new" ? (
          <Input id="name" name="name" required label="Họ tên người đại diện" placeholder="Nguyễn Thị Lan" />
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={defaultContactEmail}
          label={mode === "new" ? "Email" : "Email liên hệ công khai"}
          placeholder="lan@gombattrang.vn"
          hint={mode === "new" ? "Dùng để đăng nhập và hiển thị công khai trên gian hàng." : undefined}
        />
        <Input
          id="contactPhone"
          name="contactPhone"
          required
          defaultValue={defaultContactPhone}
          label={mode === "new" ? "Số điện thoại" : "Số điện thoại liên hệ công khai"}
          placeholder="09xx xxx xxx"
        />
      </div>

      {mode === "new" && (
        <Input id="password" name="password" type="password" required minLength={8} label="Mật khẩu" hint="Ít nhất 8 ký tự." />
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Bạn dự định bán gì?</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="intendsProducts" defaultChecked className={CHECK_CLASS} /> Sản phẩm vật lý
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="intendsCourses" defaultChecked className={CHECK_CLASS} /> Khoá học
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="intendsLibraryItems" defaultChecked className={CHECK_CLASS} /> Sách &amp; tài liệu
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="bankName" name="bankName" label="Ngân hàng nhận hoa hồng" placeholder="Vietcombank" />
        <Input id="bankAccountNumber" name="bankAccountNumber" label="Số tài khoản" placeholder="0071xxxxxxxx" />
      </div>
      <Input id="bankAccountHolder" name="bankAccountHolder" label="Chủ tài khoản" placeholder="NGUYEN THI LAN" />

      <Textarea
        id="bio"
        name="bio"
        rows={3}
        label="Giới thiệu ngắn về gian hàng"
        placeholder="Xưởng gốm gia truyền 3 đời tại Bát Tràng, chuyên ấm chén và đồ trang trí men lam thủ công..."
      />

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} isLoading={pending} className="w-full justify-center">
        {pending ? "Đang gửi..." : "Gửi hồ sơ đăng ký"}
      </Button>
      <p className="text-xs text-muted">
        Bằng việc gửi hồ sơ, bạn đồng ý với Điều khoản Nhà bán hàng của RapidX. Hồ sơ được duyệt không có nghĩa từng
        sản phẩm phải chờ duyệt riêng — sau khi gian hàng được mở, bạn đăng sản phẩm lên là bán ngay.
      </p>
    </form>
  );
}
