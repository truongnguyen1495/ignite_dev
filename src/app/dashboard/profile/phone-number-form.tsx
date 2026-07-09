"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnPhoneNumberAction } from "./actions";

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
      <div>
        <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-foreground">
          Số điện thoại
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : "Lưu số điện thoại"}
      </button>
    </form>
  );
}
