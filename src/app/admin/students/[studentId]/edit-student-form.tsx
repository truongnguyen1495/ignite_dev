"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
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

export function EditStudentForm({
  studentId,
  name,
  email,
  phoneNumber,
  grantedLevel,
  status,
  isPending,
  hasRegistrationInfo,
  username,
  dateOfBirthLabel,
  children,
}: {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  grantedLevel: Level;
  status: AccountStatus;
  isPending: boolean;
  hasRegistrationInfo: boolean;
  username: string | null;
  dateOfBirthLabel: string | null;
  children?: ReactNode;
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
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
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

      {children}

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        {!isPending && hasRegistrationInfo && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-background px-4 py-3 text-sm">
            {username && (
              <span className="text-muted">
                Username: <span className="text-foreground">@{username}</span>
              </span>
            )}
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
        <form
          id="edit-student-form"
          action={formAction}
          onChange={() => setIsDirty(true)}
          className="space-y-4"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <Input id="name" name="name" label="Họ tên" defaultValue={name} required />
          <Input id="email" name="email" type="email" label="Email" defaultValue={email} required />
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            label="Số điện thoại (tùy chọn)"
            defaultValue={phoneNumber ?? ""}
            placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Mật khẩu mới (để trống nếu không đổi)"
            minLength={8}
          />
          <Select id="grantedLevel" name="grantedLevel" label="Cấp được cấp quyền" defaultValue={grantedLevel}>
            {ORDERED_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            type="submit"
            variant={isDirty ? "primary" : "secondary"}
            disabled={pending || !isDirty}
            isLoading={pending}
          >
            {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
          </Button>
        </form>
      </Card>
    </>
  );
}
