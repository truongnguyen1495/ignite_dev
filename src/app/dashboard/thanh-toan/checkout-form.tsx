"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Landmark, Plus, Truck } from "lucide-react";
import type { OrderItemKind, PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  ShippingAddressFields,
  EMPTY_SHIPPING_ADDRESS,
  type ShippingAddressErrors,
  type ShippingAddressValue,
} from "@/components/shipping-address-fields";
import { formatVND } from "@/lib/currency";
import type { AdministrativeUnit } from "@/lib/address";
import { PHONE_NUMBER_ERROR, VN_PHONE_REGEX } from "@/lib/validation";
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

/**
 * The same five rules the Server Action enforces, run early so a missing
 * ward is pointed at next to the ward field instead of arriving back as one
 * sentence at the bottom of the page after a round trip. The server stays
 * the authority — this only decides whether it is worth asking it yet.
 */
function validateAddress(value: ShippingAddressValue): ShippingAddressErrors {
  const errors: ShippingAddressErrors = {};
  if (!value.name.trim()) errors.name = "Vui lòng nhập tên người nhận.";
  if (!VN_PHONE_REGEX.test(value.phone.trim())) errors.phone = PHONE_NUMBER_ERROR;
  if (!value.provinceCode) errors.provinceCode = "Vui lòng chọn Tỉnh/Thành phố.";
  if (!value.wardCode) errors.wardCode = "Vui lòng chọn Phường/Xã.";
  if (!value.street.trim()) errors.street = "Vui lòng nhập số nhà, tên đường.";
  return errors;
}

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
 * Where to send it, what it costs, how to pay — in that order, because that
 * is the order the decisions actually happen in.
 *
 * Two columns once there is room for them: the address is the long half and
 * the money is the half people re-read before committing, so putting the
 * total and the button beside the form (instead of a screen below it) means
 * nobody scrolls back up to check what they are about to pay.
 *
 * The pay-on-delivery option is rendered but refused when the basket holds
 * anything digital, rather than hidden: a buyer who expected it should be
 * told why it isn't available, not left wondering where it went. The server
 * re-checks the same rule (canPayOnDelivery), so this is presentation only.
 */
export function CheckoutForm({
  onlyCartItemId,
  lines,
  goodsTotal,
  shippingFee,
  total,
  unitsUntilFreeShipping,
  needsShipping,
  codAllowed,
  addresses,
  provinces,
  defaultName,
  defaultPhone,
}: {
  /** Set by "Mua riêng món này" — checks out this line alone. */
  onlyCartItemId?: string;
  lines: CheckoutLine[];
  goodsTotal: number;
  shippingFee: number;
  total: number;
  /** 0 when there is nothing to nudge about — see unitsUntilFreeShipping(). */
  unitsUntilFreeShipping: number;
  needsShipping: boolean;
  codAllowed: boolean;
  addresses: SavedAddress[];
  provinces: readonly AdministrativeUnit[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  // A returning buyer starts on their default address; a first-timer starts
  // on the blank form, since there is nothing to pick.
  const [addressChoice, setAddressChoice] = useState<string>(addresses[0]?.id ?? NEW_ADDRESS);
  // Prefilled from the account, because the person buying is usually the
  // person receiving — and a wrong guess costs one edit, while an empty
  // field costs everyone typing.
  const [address, setAddress] = useState<ShippingAddressValue>({
    ...EMPTY_SHIPPING_ADDRESS,
    name: defaultName,
    phone: defaultPhone,
  });
  const [label, setLabel] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");

  const typingNew = addressChoice === NEW_ADDRESS;
  const [fieldErrors, setFieldErrors] = useState<ShippingAddressErrors>({});

  const patchAddress = useCallback((patch: Partial<ShippingAddressValue>) => {
    setAddress((current) => ({ ...current, ...patch }));
    // Clears only the fields just touched: correcting the phone number
    // shouldn't wipe the reminder that no ward has been chosen yet.
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof ShippingAddressValue)[]) delete next[key];
      return next;
    });
  }, []);

  function submit() {
    setError(undefined);
    if (needsShipping && typingNew) {
      const errors = validateAddress(address);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setError("Vui lòng điền đầy đủ thông tin giao hàng.");
        return;
      }
    }
    startTransition(async () => {
      const result = await confirmCartOrderAction({
        paymentMethod: method,
        ...(onlyCartItemId ? { onlyCartItemId } : {}),
        ...(needsShipping && !typingNew ? { addressId: addressChoice } : {}),
        ...(needsShipping && typingNew
          ? { shipping: address, saveAddress, addressLabel: label }
          : {}),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/orders/${result.orderId}`);
    });
  }

  const summary = (
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

        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Tiền hàng</span>
            <span className="tabular-nums text-foreground">{formatVND(goodsTotal)}</span>
          </div>
          {/* Only shown when something actually ships. A cart of courses has
              no delivery line to explain, and a "0 đ" row there would only
              raise the question of why shipping is mentioned at all. */}
          {needsShipping && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Phí vận chuyển</span>
              <span className="tabular-nums text-foreground">
                {shippingFee === 0 ? "Miễn phí" : formatVND(shippingFee)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 text-base font-semibold">
            <span className="text-foreground">Tổng cộng</span>
            <span className="tabular-nums text-primary">{formatVND(total)}</span>
          </div>
        </div>

        {needsShipping && shippingFee === 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-xs text-success">
            <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Đơn này được miễn phí vận chuyển.</span>
          </p>
        )}
        {unitsUntilFreeShipping > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-faint-bg px-3 py-2.5 text-xs text-muted">
            <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Mua thêm {unitsUntilFreeShipping} sản phẩm nữa để được miễn phí vận chuyển.
            </span>
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Phương thức thanh toán</h2>
        <Option selected={method === "BANK_TRANSFER"} onSelect={() => setMethod("BANK_TRANSFER")}>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Landmark className="h-4 w-4 shrink-0 text-muted" />
            Chuyển khoản trước
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Quét mã QR ngay sau khi đặt — số tiền và nội dung đã điền sẵn, đơn tự xác nhận trong vài
            giây.
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
            Trả tiền mặt cho người giao hàng khi nhận được sản phẩm.
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

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          type="button"
          className="w-full"
          onClick={submit}
          isLoading={pending}
          disabled={pending}
        >
          Đặt hàng · {formatVND(total)}
        </Button>
      </section>
    </div>
  );

  // Nothing physical in the basket: there is no address half, so the
  // summary keeps the page's own narrow column instead of stretching to
  // fill a two-column grid that has lost one of its columns.
  if (!needsShipping) {
    return <div className="mx-auto w-full max-w-xl">{summary}</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Giao đến</h2>
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
            <ShippingAddressFields
              provinces={provinces}
              value={address}
              onChange={patchAddress}
              errors={fieldErrors}
              disabled={pending}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
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
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Nhà, Kho hàng…"
                disabled={pending}
              />
            )}
          </div>
        )}
      </section>

      {summary}
    </div>
  );
}
