"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createGroupAction } from "../actions";

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const err = await createGroupAction(name);
      if (err) setError(err);
    });
  }

  return (
    <div className="space-y-4">
      <Input
        label="Tên nhóm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ví dụ: Nhóm Đại Bàng"
        error={error}
      />
      <div className="flex justify-end">
        <Button type="button" disabled={pending} isLoading={pending} onClick={submit}>
          Tạo nhóm
        </Button>
      </div>
    </div>
  );
}
