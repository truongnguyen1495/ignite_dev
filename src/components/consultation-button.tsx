"use client";

import { useState, useTransition, type ReactNode } from "react";
import { X, Check } from "lucide-react";
import { requestConsultationAction } from "@/app/product/consultation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

// "Đặt lịch tư vấn" trigger — same styled-trigger + app-standard dialog
// pattern as ProductBuyButton, but the dialog is a small form (name/phone/
// preferred time) instead of a price confirm. Writes a ConsultationRequest
// row for an admin to follow up on (see /admin/consultations); nothing else
// changes on the page, so a success state replaces the form in place rather
// than just closing, so the student knows it actually went through.
export function ConsultationButton({
  productId,
  title,
  className,
  children,
}: {
  productId: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const close = () => {
    setOpen(false);
    setSubmitted(false);
    setError(undefined);
    setName("");
    setPhone("");
    setPreferredTime("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await requestConsultationAction(productId, name, phone, preferredTime);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          // Guards against being nested inside a card-wide <Link>, same as
          // ProductBuyButton — without this, clicking would both open the
          // dialog and navigate away.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
                  <Check className="h-6 w-6" />
                </span>
                <p className="font-semibold text-foreground">Đã gửi yêu cầu tư vấn!</p>
                <p className="text-sm text-muted">Chúng tôi sẽ liên hệ với bạn theo khung giờ đã chọn.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <h2 className="pr-8 text-base font-semibold text-foreground">Đặt lịch tư vấn</h2>
                  <p className="mt-1 text-sm text-muted">{title}</p>
                </div>
                <Input
                  id="consultation-name"
                  label="Họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  id="consultation-phone"
                  label="Số điện thoại"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input
                  id="consultation-time"
                  label="Khung giờ mong muốn"
                  placeholder="VD: Chiều thứ 3, 14h-16h"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" disabled={pending} isLoading={pending}>
                    Gửi yêu cầu
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
