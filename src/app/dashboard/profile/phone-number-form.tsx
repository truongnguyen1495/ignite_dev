"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnPhoneNumberAction } from "./actions";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function PhoneNumberForm({ currentPhoneNumber }: { currentPhoneNumber: string | null }) {
  const [value, setValue] = useState(currentPhoneNumber ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOwnPhoneNumberAction(value);
      setError(result);
      if (!result) {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        label="Số điện thoại"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
        error={error}
      />
      <Button type="submit" isLoading={pending}>
        {pending ? "Đang lưu..." : "Lưu số điện thoại"}
      </Button>
    </form>
  );
}
