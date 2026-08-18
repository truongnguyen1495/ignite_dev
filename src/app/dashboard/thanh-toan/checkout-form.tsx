"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Landmark, Plus } from "lucide-react";
import type { OrderItemKind, PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/currency";
import { confirmCartOrderAction } from "@/app/dashboard/cart/actions";

export type CheckoutLine = {
  id: string;
  kind: OrderItemKind;
  title: string;
  unitPrice: number;
  quantity: number;
};

export type SavedAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  isDefault: boolean;
};

const NEW_ADDRESS = "__new__";

function Option({
  selected,
  onSelect,
  disabled = false,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-surface opacity-60"
          : selected
            ? "border-primary-border bg-primary-bg-subtle"
            : "border-border bg-surface hover:bg-surface-hover"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected && !disabled ? "border-primary" : "border-border-strong"
        }`}
      >
        {selected && !disabled && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/**
 * Review, address, method, confirm — in that order, because that is the
 * order the decisions actually happen in.
 *
 * The pay-on-delivery option is rendered but refused when the basket holds
 * anything digital, rather than hidden: a buyer who expected it should be
 * told why it isn't available, not left wondering where it went. The server
 * re-checks the same rule (canPayOnDelivery), so this is presentation only.
 */
export function CheckoutForm({
  onlyCartItemId,
  lines,
  total,
  needsShipping,
  codAllowed,
  addresses,
  defaultName,
}: {
  /** Set by "Mua riêng món này" — checks out this line alone. */
  onlyCartItemId?: string;
  lines: CheckoutLine[];
  total: number;
  needsShipping: boolean;
  codAllowed: boolean;
  addresses: SavedAddress[];
  defaultName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  // A returning buyer starts on their default address; a first-timer starts
  // on the blank form, since there is nothing to pick.
  const [addressChoice, setAddressChoice] = useState<string>(addresses[0]?.id ?? NEW_ADDRESS);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");

  const typingNew = addressChoice === NEW_ADDRESS;

  function submit() {
    setError(undefined);
    if (needsShipping && typingNew && (!name.trim() || !phone.trim() || !address.trim())) {
      setError("Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.");
      return;
    }
    startTransition(async () => {
      const result = await confirmCartOrderAction({
        paymentMethod: method,
        ...(onlyCartItemId ? { onlyCartItemId } : {}),
        ...(needsShipping && !typingNew ? { addressId: addressChoice } : {}),
        ...(needsShipping && typingNew
          ? {
              shipping: { name: name.trim(), phone: phone.trim(), address: address.trim() },
              saveAddress,
              addressLabel: label,
            }
          : {}),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/orders/${result.orderId}`);
    });
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Đơn hàng</h2>
        <ul className="space-y-2 text-sm">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-foreground">{line.title}</span>
                {line.quantity > 1 && (
                  <span className="text-xs text-muted">
                    {line.quantity} × {formatVND(line.unitPrice)}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatVND(line.unitPrice * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
          <span className="text-foreground">Tổng cộng</span>
          <span className="tabular-nums text-foreground">{formatVND(total)}</span>
        </div>
      </section>

      {/* Only asked when something in the basket physically ships — a cart of
          courses and books has nowhere to be delivered. */}
      {needsShipping && (
        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Địa chỉ nhận hàng</h2>
          {addresses.map((saved) => (
            <Option
              key={saved.id}
              selected={addressChoice === saved.id}
              onSelect={() => setAddressChoice(saved.id)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {saved.recipientName} · {saved.recipientPhone}
                </span>
                {saved.isDefault && <Badge color="primary">Mặc định</Badge>}
                {saved.label && <Badge color="muted">{saved.label}</Badge>}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{saved.addressLine}</span>
            </Option>
          ))}
          <Option selected={typingNew} onSelect={() => setAddressChoice(NEW_ADDRESS)}>
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Plus className="h-3.5 w-3.5" />
              Giao đến địa chỉ khác
            </span>
          </Option>

          {typingNew && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-hover p-3">
              <Input
                id="ship-name"
                label="Họ tên người nhận"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
              />
              <Input
                id="ship-phone"
                label="Số điện thoại"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                disabled={pending}
              />
              <Textarea
                id="ship-address"
                label="Địa chỉ nhận hàng"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                disabled={pending}
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  disabled={pending}
                  className="h-4 w-4 rounded border-border-strong"
                />
                Lưu địa chỉ này cho lần sau
              </label>
              {saveAddress && (
                <Input
                  id="ship-label"
                  label="Đặt tên cho địa chỉ (tùy chọn)"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Nhà, Kho hàng…"
                  disabled={pending}
                />
              )}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Cách thanh toán</h2>
        <Option selected={method === "BANK_TRANSFER"} onSelect={() => setMethod("BANK_TRANSFER")}>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Landmark className="h-4 w-4 shrink-0 text-muted" />
            Chuyển khoản ngân hàng
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Quét mã QR có sẵn số tiền và nội dung — đơn tự xác nhận trong vài giây.
          </span>
        </Option>
        <Option
          selected={method === "COD"}
          disabled={!codAllowed}
          onSelect={() => setMethod("COD")}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Banknote className="h-4 w-4 shrink-0 text-muted" />
            Thanh toán khi nhận hàng
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Trả tiền mặt cho người giao hàng.
          </span>
        </Option>
        {!codAllowed && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Đơn này có khóa học hoặc sách số — mở được ngay khi thanh toán, nên không dùng được
              hình thức trả khi nhận hàng. Tách thành hai đơn nếu bạn muốn trả tiền mặt cho phần sản
              phẩm.
            </span>
          </p>
        )}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" className="w-full" onClick={submit} isLoading={pending} disabled={pending}>
        Đặt hàng · {formatVND(total)}
      </Button>
    </div>
  );
}
