"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateStudentAction } from "../actions";
import { ORDERED_LEVELS, LEVEL_LABELS, NO_LEVEL_VALUE } from "@/lib/levels";
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
  hasRegistrationInfo,
  username,
  dateOfBirthLabel,
  canEdit,
  canDemote,
  isHocVien,
}: {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  grantedLevel: Level | null;
  status: AccountStatus;
  hasRegistrationInfo: boolean;
  username: string | null;
  dateOfBirthLabel: string | null;
  // EDIT_STUDENTS/EDIT_PROSPECTIVE_STUDENTS (or Super Admin) — without it
  // this renders as a read-only view: fields disabled, no submit button.
  // updateStudentAction enforces the same check server-side regardless.
  canEdit: boolean;
  // Whether the current admin may demote a học viên back to học sinh
  // (DEMOTE_STUDENTS permission or Super Admin) — hides the "Học sinh"
  // option below for a currently-leveled student otherwise, so this form
  // can't be used to bypass demoteStudentAction's permission boundary.
  // Irrelevant (always shown) for a student who's already học sinh, since
  // re-selecting the same value isn't a demotion.
  canDemote: boolean;
  // A "học sinh" (grantedLevel null) edit view hides the password reset
  // field and the level dropdown entirely, per explicit user request —
  // promoting a học sinh into the 5-level system is expected to go through
  // the join-request approval queue (/admin/level-up-requests) instead of
  // this shared form. grantedLevel is still submitted as a hidden NONE
  // input so updateStudentAction's required field still validates.
  isHocVien: boolean;
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

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin tài khoản</h2>
        {hasRegistrationInfo && (
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
          {isHocVien ? (
            <>
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
                defaultValue={grantedLevel ?? NO_LEVEL_VALUE}
                disabled={!canEdit}
              >
                {ORDERED_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {LEVEL_LABELS[level]}
                  </option>
                ))}
                {(canDemote || grantedLevel === null) && (
                  <option value={NO_LEVEL_VALUE}>Học sinh (chưa tham gia đào tạo 5 cấp)</option>
                )}
              </Select>
            </>
          ) : (
            <input type="hidden" name="grantedLevel" value={NO_LEVEL_VALUE} />
          )}
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
