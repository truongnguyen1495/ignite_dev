"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerAction, type RegisterState } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-base sm:text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  hint,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

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
      label="Ngày tháng năm sinh"
      required
      placeholder="dd/mm/yyyy"
      hint="Nhập ngày sinh dạng ngày/tháng/năm, ví dụ 15/08/2000."
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
  const [username, setUsername] = useState("");
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
        id="username"
        name="username"
        label="Username"
        required
        minLength={3}
        hint="Ít nhất 3 ký tự, chỉ gồm chữ, số, dấu chấm và gạch dưới."
        error={fieldErrors.username}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
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
      <PasswordField
        id="password"
        name="password"
        label="Mật khẩu"
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        error={fieldErrors.password}
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Xác nhận mật khẩu"
        autoComplete="new-password"
        hint="Nhập lại đúng mật khẩu ở trên."
        error={fieldErrors.confirmPassword}
        value={confirmPassword}
        onChange={setConfirmPassword}
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
    </form>
  );
}
