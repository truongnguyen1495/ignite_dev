"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { User } from "@prisma/client";
import { ApproveStudentButton, DeleteStudentButton } from "./[studentId]/danger-actions";

export function PendingRegistrations({ students }: { students: User[] }) {
  const [open, setOpen] = useState(students.length > 0);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          Đăng ký chờ duyệt
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
            {students.length}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-6 pt-4">
          {students.length === 0 ? (
            <p className="text-sm text-muted">Không có đăng ký nào đang chờ duyệt.</p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                className="rounded-lg border border-border border-l-4 border-l-warning p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{student.name}</p>
                    <p className="text-sm text-muted">{student.email}</p>
                  </div>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Xem chi tiết
                  </Link>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {student.username && (
                    <div>
                      <dt className="text-xs text-muted">Username</dt>
                      <dd className="text-foreground">@{student.username}</dd>
                    </div>
                  )}
                  {student.dateOfBirth && (
                    <div>
                      <dt className="text-xs text-muted">Ngày sinh</dt>
                      <dd className="text-foreground">
                        {student.dateOfBirth.toLocaleDateString("vi-VN")}
                      </dd>
                    </div>
                  )}
                  {student.phoneNumber && (
                    <div>
                      <dt className="text-xs text-muted">Số điện thoại</dt>
                      <dd className="text-foreground">{student.phoneNumber}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted">Ngày đăng ký</dt>
                    <dd className="text-foreground">{student.createdAt.toLocaleDateString("vi-VN")}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <ApproveStudentButton studentId={student.id} />
                  <DeleteStudentButton
                    studentId={student.id}
                    studentName={student.name}
                    pendingRegistration
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
