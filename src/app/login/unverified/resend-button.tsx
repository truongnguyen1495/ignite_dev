"use client";

import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { resendVerificationEmailAction } from "./actions";

const COOLDOWN_SECONDS = 60;

export function ResendVerificationForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  return (
    <div className="space-y-3 text-left">
      <Input
        id="resend-email"
        type="email"
        label="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        isLoading={pending}
        disabled={cooldown > 0 || !email}
        onClick={() => {
          startTransition(async () => {
            await resendVerificationEmailAction(email);
            setSent(true);
            setCooldown(COOLDOWN_SECONDS);
          });
        }}
      >
        {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email xác thực"}
      </Button>
      {sent && (
        <p className="text-sm text-success">
          Nếu email hợp lệ và chưa xác thực, chúng tôi đã gửi lại liên kết xác thực.
        </p>
      )}
    </div>
  );
}
