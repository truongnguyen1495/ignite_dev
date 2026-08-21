"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AdministrativeUnit } from "@/lib/address";

/** Exactly what a courier needs, and nothing the buyer has to repeat. */
export type ShippingAddressValue = {
  name: string;
  phone: string;
  provinceCode: string;
  wardCode: string;
  street: string;
};

export const EMPTY_SHIPPING_ADDRESS: ShippingAddressValue = {
  name: "",
  phone: "",
  provinceCode: "",
  wardCode: "",
  street: "",
};

export type ShippingAddressErrors = Partial<Record<keyof ShippingAddressValue, string>>;

/**
 * The "Giao đến" block: who receives it, on what number, and where.
 *
 * The address is collected as tỉnh/thành → phường/xã → số nhà rather than
 * one free-text box, which is what it used to be. A typed line loses the
 * moment someone writes "Q. Hải Châu" (a district that no longer exists) or
 * misspells a ward: the order still saves, and the problem surfaces at the
 * depot. Picking from the official list means the province and ward on an
 * order are always real ones, and the server can prove it — it re-resolves
 * both codes against the same directory before writing anything.
 *
 * Wards load per province from /api/dia-gioi/[code] and are kept in a ref
 * cache for the life of the form, so switching back and forth between two
 * provinces while comparing addresses costs one request each, not one per
 * switch.
 */
export function ShippingAddressFields({
  provinces,
  value,
  onChange,
  errors,
  disabled = false,
}: {
  provinces: readonly AdministrativeUnit[];
  value: ShippingAddressValue;
  onChange: (patch: Partial<ShippingAddressValue>) => void;
  errors?: ShippingAddressErrors;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const provinceCode = value.provinceCode;

  // Every province ever loaded, kept for the life of the form: comparing
  // two addresses by flipping between provinces costs one request each, not
  // one per flip. State rather than a ref because what is on screen is
  // derived from it.
  const [wardsByProvince, setWardsByProvince] = useState<
    Record<string, readonly AdministrativeUnit[]>
  >({});
  const [failedProvince, setFailedProvince] = useState<string | null>(null);
  // Bumped by "Thử lại" to re-run the effect for the same province code,
  // which a dependency on provinceCode alone could never do.
  const [retryToken, setRetryToken] = useState(0);

  // Derived, not stored: three booleans kept in sync by hand is three ways
  // to end up showing a spinner over the previous province's wards.
  const wards = provinceCode ? wardsByProvince[provinceCode] : undefined;
  const wardLoadFailed = Boolean(provinceCode) && failedProvince === provinceCode;
  const loadingWards = Boolean(provinceCode) && !wards && !wardLoadFailed;

  useEffect(() => {
    if (!provinceCode || wardsByProvince[provinceCode]) return;

    // Aborted on province change so a slow response for the province the
    // buyer just moved off can never overwrite the list for the one they
    // are looking at now.
    const controller = new AbortController();
    fetch(`/api/dia-gioi/${encodeURIComponent(provinceCode)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { wards?: AdministrativeUnit[] }) => {
        setWardsByProvince((current) => ({ ...current, [provinceCode]: data.wards ?? [] }));
        setFailedProvince((current) => (current === provinceCode ? null : current));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailedProvince(provinceCode);
      });

    return () => controller.abort();
  }, [provinceCode, wardsByProvince, retryToken]);

  // Changing province invalidates the ward under it — Phường Hải Châu does
  // not exist in Hà Nội — so the old choice is dropped rather than left to
  // be submitted with the new province.
  const handleProvinceChange = useCallback(
    (code: string) => {
      onChange(code === provinceCode ? { provinceCode: code } : { provinceCode: code, wardCode: "" });
    },
    [onChange, provinceCode]
  );

  return (
    <div className="space-y-3">
      <Input
        id={`${fieldId}-name`}
        label="Tên người nhận"
        value={value.name}
        onChange={(event) => onChange({ name: event.target.value })}
        placeholder="Nguyễn Văn A"
        autoComplete="name"
        disabled={disabled}
        error={errors?.name}
      />
      <Input
        id={`${fieldId}-phone`}
        label="Số điện thoại"
        type="tel"
        inputMode="numeric"
        value={value.phone}
        onChange={(event) => onChange({ phone: event.target.value })}
        placeholder="0912345678"
        autoComplete="tel"
        disabled={disabled}
        error={errors?.phone}
      />
      <SearchableSelect
        id={`${fieldId}-province`}
        label="Tỉnh/Thành phố"
        placeholder="Chọn Tỉnh/Thành phố"
        options={provinces.map((province) => ({ value: province.code, label: province.name }))}
        value={value.provinceCode}
        onChange={handleProvinceChange}
        disabled={disabled}
        error={errors?.provinceCode}
      />
      <div>
        <SearchableSelect
          id={`${fieldId}-ward`}
          label="Phường/Xã"
          // The disabled state says what to do next instead of just being
          // grey: the ward list literally cannot exist before a province is
          // chosen, and that is worth one sentence.
          placeholder={provinceCode ? "Chọn Phường/Xã" : "Chọn Tỉnh/Thành phố trước"}
          options={(wards ?? []).map((ward) => ({ value: ward.code, label: ward.name }))}
          value={value.wardCode}
          onChange={(code) => onChange({ wardCode: code })}
          disabled={disabled || !provinceCode || wardLoadFailed}
          loading={loadingWards}
          error={errors?.wardCode}
        />
        {wardLoadFailed && (
          <p className="mt-1.5 text-xs text-danger">
            Không tải được danh sách Phường/Xã.{" "}
            <button
              type="button"
              onClick={() => {
                setFailedProvince(null);
                setRetryToken((token) => token + 1);
              }}
              className="font-medium underline underline-offset-2"
            >
              Thử lại
            </button>
          </p>
        )}
      </div>
      <Input
        id={`${fieldId}-street`}
        label="Số nhà, tên đường"
        value={value.street}
        onChange={(event) => onChange({ street: event.target.value })}
        placeholder="45 Trần Hưng Đạo"
        autoComplete="address-line1"
        disabled={disabled}
        error={errors?.street}
      />
    </div>
  );
}
