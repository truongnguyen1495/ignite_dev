"use client";

import { useActionState } from "react";
import { createStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS, NO_LEVEL_VALUE } from "@/lib/levels";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function CreateStudentForm() {
  const [error, formAction, pending] = useActionState(createStudentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Input id="name" name="name" required label="Họ tên" />
      <Input id="email" name="email" type="email" required label="Email" />
      <Input
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
        label="Số điện thoại (tùy chọn)"
      />
      <Input id="password" name="password" type="password" required minLength={8} label="Mật khẩu" />
      <Select id="grantedLevel" name="grantedLevel" defaultValue={ORDERED_LEVELS[0]} label="Cấp được cấp quyền">
        {ORDERED_LEVELS.map((level) => (
          <option key={level} value={level}>
            {LEVEL_LABELS[level]}
          </option>
        ))}
        <option value={NO_LEVEL_VALUE}>Chưa xếp cấp (không thuộc 5 cấp)</option>
      </Select>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} isLoading={pending}>
        {pending ? "Đang tạo..." : "Tạo học viên"}
      </Button>
    </form>
  );
}
