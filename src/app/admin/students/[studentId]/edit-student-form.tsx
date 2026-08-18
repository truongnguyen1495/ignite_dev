"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import type { AccountStatus, Level } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { UserAvatar } from "@/components/ui/user-avatar";

export function EditStudentForm({
  studentId,
  name,
  avatarUrl,
  email,
  phoneNumber,
  grantedLevel,
  status,
  hasRegistrationInfo,
  dateOfBirthLabel,
  canEdit,
}: {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  phoneNumber: string | null;
  grantedLevel: Level;
  status: AccountStatus;
  hasRegistrationInfo: boolean;
  dateOfBirthLabel: string | null;
  // EDIT_STUDENTS (or Super Admin) — without it this renders as a read-only
  // view: fields disabled, no submit button. updateStudentAction enforces
  // the same check server-side regardless.
  canEdit: boolean;
}) {
  const [error, formAction, pending] = useActionState(updateStudentAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setIsDirty(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <>
      <div className="sticky top-0 z-20 mb-6 border-b border-border bg-background py-3">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <UserAvatar src={avatarUrl} name={name} size={56} className="text-lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
              <StatusBadge status={status} />
              <LevelBadge level={grantedLevel} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{email}</p>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        {hasRegistrationInfo && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-background px-4 py-3 text-sm">
            {dateOfBirthLabel && (
              <span className="text-muted">
                Ngày sinh: <span className="text-foreground">{dateOfBirthLabel}</span>
              </span>
            )}
            {phoneNumber && (
              <span className="text-muted">
                Số điện thoại: <span className="text-foreground">{phoneNumber}</span>
              </span>
            )}
          </div>
        )}
        {!canEdit && (
          <p className="mb-4 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
            Bạn chỉ có quyền xem tài khoản này — không có quyền sửa.
          </p>
        )}
        <form
          id="edit-student-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <Input id="name" name="name" label="Họ tên" defaultValue={name} required disabled={!canEdit} />
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            defaultValue={email}
            required
            disabled={!canEdit}
          />
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            label="Số điện thoại (tùy chọn)"
            defaultValue={phoneNumber ?? ""}
            placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
            disabled={!canEdit}
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Mật khẩu mới (để trống nếu không đổi)"
            minLength={8}
            disabled={!canEdit}
          />
          <Select
            id="grantedLevel"
            name="grantedLevel"
            label="Cấp được cấp quyền"
            defaultValue={grantedLevel}
            disabled={!canEdit}
          >
            {ORDERED_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
          {error && <p className="text-sm text-danger">{error}</p>}
          {canEdit && (
            <Button
              type="submit"
              variant={isDirty ? "primary" : "secondary"}
              disabled={pending || !isDirty}
              isLoading={pending}
            >
              {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
            </Button>
          )}
        </form>
      </Card>
    </>
  );
}
