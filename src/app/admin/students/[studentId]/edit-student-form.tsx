"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import type { AccountStatus, Level } from "@prisma/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { LevelBadge } from "@/components/ui/level-badge";

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
      <div className="sticky top-0 z-20 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border bg-background py-3">
        <div>
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
        <button
          type="submit"
          form="edit-student-form"
          disabled={pending || !isDirty}
          className={
            pending || !isDirty
              ? "rounded-lg bg-border px-4 py-2 text-sm font-medium text-muted"
              : "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          }
        >
          {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
        </button>
      </div>

      {children}

      <div className="rounded-xl border border-border bg-surface p-6">
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
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
              Họ tên
            </label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-foreground">
              Số điện thoại (tùy chọn)
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={phoneNumber ?? ""}
              placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mật khẩu mới (để trống nếu không đổi)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="grantedLevel" className="mb-1.5 block text-sm font-medium text-foreground">
              Cấp được cấp quyền
            </label>
            <select
              id="grantedLevel"
              name="grantedLevel"
              defaultValue={grantedLevel}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {ORDERED_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </div>
    </>
  );
}
