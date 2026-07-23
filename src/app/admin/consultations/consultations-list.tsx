"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markConsultationContactedAction, unmarkConsultationContactedAction } from "./actions";

export type ConsultationListItem = {
  id: string;
  productTitle: string;
  studentName: string;
  studentEmail: string;
  name: string;
  phone: string;
  preferredTime: string;
  createdAtLabel: string;
  contacted: boolean;
};

function ContactedToggle({ item }: { item: ConsultationListItem }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={item.contacted ? "secondary" : "primary"}
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          if (item.contacted) {
            await unmarkConsultationContactedAction(item.id);
          } else {
            await markConsultationContactedAction(item.id);
          }
          router.refresh();
        });
      }}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : item.contacted ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Phone className="h-3.5 w-3.5" />
      )}
      {item.contacted ? "Đã liên hệ" : "Đánh dấu đã liên hệ"}
    </Button>
  );
}

export function ConsultationsList({ items }: { items: ConsultationListItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Chưa có yêu cầu tư vấn nào.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.name}</p>
              <Badge color={item.contacted ? "success" : "warning"}>
                {item.contacted ? "Đã liên hệ" : "Chờ liên hệ"}
              </Badge>
            </div>
            <p className="text-sm text-foreground">{item.productTitle}</p>
            <p className="text-xs text-muted">
              {item.phone} · Khung giờ mong muốn: {item.preferredTime}
            </p>
            <p className="truncate text-xs text-muted">
              Tài khoản: {item.studentName} · {item.studentEmail} · {item.createdAtLabel}
            </p>
          </div>
          <ContactedToggle item={item} />
        </li>
      ))}
    </ul>
  );
}
