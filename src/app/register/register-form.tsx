"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type RegisterState } from "./actions";
import { Input } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";

// Digits-only text field formatted as dd/mm/yyyy instead of <input type="date">,
// since the native date picker on many mobile browsers only supports tapping
// through a wheel/calendar and blocks typing the date by hand.
function DateOfBirthField({
  id,
  name,
  error,
  value,
  onChange,
}: {
  id: string;
  name: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    onChange(formatted);
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      label="Ngày tháng năm sinh (không bắt buộc)"
      placeholder="dd/mm/yyyy"
      hint="Có thể bỏ trống. Nếu nhập, dùng dạng ngày/tháng/năm, ví dụ 15/08/2000."
      error={error}
      value={value}
      onChange={handleChange}
      maxLength={10}
      autoComplete="bday"
    />
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, undefined);
  const fieldErrors = state?.fieldErrors ?? {};

  // Every field is controlled so a failed submission only ever clears the
  // fields that are actually wrong — React resets uncontrolled inputs after
  // *any* form action call (success or failure), which would otherwise wipe
  // fields the user already filled in correctly.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form action={formAction} className="w-full space-y-4">
      <Input
        id="name"
        name="name"
        label="Họ và tên"
        required
        hint="Nhập họ và tên đầy đủ như trên giấy tờ tùy thân."
        error={fieldErrors.name}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        hint="Dùng email bạn đang sử dụng để nhận thông báo tài khoản."
        error={fieldErrors.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        label="Số điện thoại"
        required
        placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
        hint="Định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx."
        error={fieldErrors.phoneNumber}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <DateOfBirthField
        id="dateOfBirth"
        name="dateOfBirth"
        error={fieldErrors.dateOfBirth}
        value={dateOfBirth}
        onChange={setDateOfBirth}
      />
      <PasswordInput
        id="password"
        name="password"
        label="Mật khẩu"
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        error={fieldErrors.password}
        value={password}
        required
        minLength={8}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        autoComplete="new-password"
        hint="Nhập lại đúng mật khẩu ở trên."
        error={fieldErrors.confirmPassword}
        value={confirmPassword}
        required
        minLength={8}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit" className="w-full" isLoading={pending}>
        {pending ? "Đang đăng ký..." : "Đăng ký"}
      </Button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Đăng nhập
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Muốn bán hàng thay vì học?{" "}
        <Link href="/vendor/dang-ky" className="font-medium text-primary hover:text-primary-hover">
          Đăng ký làm Nhà bán hàng
        </Link>
      </p>
    </form>
  );
}
