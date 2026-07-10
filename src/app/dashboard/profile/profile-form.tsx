"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil, CheckCircle2 } from "lucide-react";
import { updateOwnProfileAction } from "./actions";
import { Button } from "@/components/ui/button";

function formatVNDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function StaticField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function EditableField({
  label,
  type,
  value,
  displayValue,
  editing,
  onToggle,
  onChange,
}: {
  label: string;
  type: "text" | "tel" | "date";
  value: string;
  displayValue: string;
  editing: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      ) : (
        <dd className="mt-0.5 flex items-center gap-1.5">
          <span className="text-foreground">{displayValue}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={`Sửa ${label}`}
            className="text-muted transition-colors hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </dd>
      )}
    </div>
  );
}

export function ProfileForm({
  name,
  email,
  username,
  dateOfBirth,
  phoneNumber,
  grantedLevelLabel,
}: {
  name: string;
  email: string;
  username: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  grantedLevelLabel: string;
}) {
  const initial = { name, dateOfBirth: dateOfBirth ?? "", phoneNumber: phoneNumber ?? "" };
  const [values, setValues] = useState(initial);
  const [editing, setEditing] = useState({ name: false, dateOfBirth: false, phoneNumber: false });
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isDirty =
    values.name !== initial.name ||
    values.dateOfBirth !== initial.dateOfBirth ||
    values.phoneNumber !== initial.phoneNumber;

  function update(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setSuccess(false);
  }

  function toggleEdit(field: keyof typeof editing) {
    setEditing((e) => ({ ...e, [field]: !e[field] }));
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateOwnProfileAction(values);
      if (result) {
        setError(result);
        return;
      }
      setEditing({ name: false, dateOfBirth: false, phoneNumber: false });
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
        <EditableField
          label="Họ và tên"
          type="text"
          value={values.name}
          displayValue={values.name}
          editing={editing.name}
          onToggle={() => toggleEdit("name")}
          onChange={(v) => update("name", v)}
        />
        <StaticField label="Email" value={email} />
        {username && <StaticField label="Username" value={`@${username}`} />}
        <EditableField
          label="Ngày sinh"
          type="date"
          value={values.dateOfBirth}
          displayValue={values.dateOfBirth ? formatVNDate(values.dateOfBirth) : "Chưa cập nhật"}
          editing={editing.dateOfBirth}
          onToggle={() => toggleEdit("dateOfBirth")}
          onChange={(v) => update("dateOfBirth", v)}
        />
        <EditableField
          label="Số điện thoại"
          type="tel"
          value={values.phoneNumber}
          displayValue={values.phoneNumber || "Chưa cập nhật"}
          editing={editing.phoneNumber}
          onToggle={() => toggleEdit("phoneNumber")}
          onChange={(v) => update("phoneNumber", v)}
        />
        <StaticField label="Cấp được cấp quyền" value={grantedLevelLabel} />
      </dl>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {success && !isDirty && !error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Thông tin của bạn đã được cập nhật.
        </p>
      )}
      {isDirty && (
        <Button type="submit" className="mt-4" isLoading={pending}>
          {pending ? "Đang cập nhật..." : "Cập nhật thông tin"}
        </Button>
      )}
    </form>
  );
}
