"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Filter, ArrowUpDown } from "lucide-react";
import type { AccountStatus, Level } from "@prisma/client";
import { LevelBadge } from "@/components/ui/level-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ORDERED_LEVELS, LEVEL_LABELS, levelRank } from "@/lib/levels";
import { ToggleStudentStatusButton, DeleteStudentButton, DemoteStudentButton } from "./[studentId]/danger-actions";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  grantedLevel: Level;
  status: AccountStatus;
  // When this student was admitted into the 5-cấp system — the reviewedAt
  // of their approved join request, or createdAt for a học viên an admin
  // created directly (never went through a join request at all).
  joinedAt: Date;
};

type SortKey = "level" | "joinedAt";
type SortDir = "asc" | "desc";
const STATUS_OPTIONS: { value: AccountStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "LOCKED", label: "Đã khóa" },
];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "joinedAt", label: "Ngày tham gia hệ thống 5 cấp" },
  { value: "level", label: "Cấp độ" },
];

export function StudentsTable({
  students,
  canLock,
  canDelete,
  canDemote,
}: {
  students: StudentRow[];
  canLock: boolean;
  canDelete: boolean;
  canDemote: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<Set<Level>>(new Set());
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleLevel(level: Level) {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }

  const rows = useMemo(() => {
    let result = students;
    if (levelFilter.size > 0) {
      result = result.filter((s) => levelFilter.has(s.grantedLevel));
    }
    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }
    result = [...result].sort((a, b) => {
      const diff =
        sortKey === "level"
          ? levelRank(a.grantedLevel) - levelRank(b.grantedLevel)
          : a.joinedAt.getTime() - b.joinedAt.getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return result;
  }, [students, levelFilter, statusFilter, sortKey, sortDir]);

  const activeFilterCount = (levelFilter.size > 0 ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0);
  const closeMenus = () => {
    setFilterOpen(false);
    setSortOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {(filterOpen || sortOpen) && (
          <div className="fixed inset-0 z-10" onClick={closeMenus} aria-hidden />
        )}

        <div className="relative z-20">
          <button
            type="button"
            onClick={() => {
              setFilterOpen((o) => !o);
              setSortOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              activeFilterCount > 0
                ? "border-primary-border-hover bg-primary-bg text-primary"
                : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Filter className="h-4 w-4" />
            Lọc
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Cấp độ</p>
                {levelFilter.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setLevelFilter(new Set())}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {ORDERED_LEVELS.map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={levelFilter.has(level)}
                      onChange={() => toggleLevel(level)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {LEVEL_LABELS[level]}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-foreground">Trạng thái</p>
              <div className="mt-2 space-y-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="studentStatusFilter"
                      checked={statusFilter === opt.value}
                      onChange={() => setStatusFilter(opt.value)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative z-20">
          <button
            type="button"
            onClick={() => {
              setSortOpen((o) => !o);
              setFilterOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sắp xếp
          </button>
          {sortOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
              <p className="text-xs font-semibold text-foreground">Sắp xếp theo</p>
              <div className="mt-2 space-y-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="studentSortKey"
                      checked={sortKey === opt.value}
                      onChange={() => setSortKey(opt.value)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={() => setSortDir("asc")}
                  className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    sortDir === "asc" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
                  }`}
                >
                  Tăng dần
                </button>
                <button
                  type="button"
                  onClick={() => setSortDir("desc")}
                  className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
                    sortDir === "desc" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
                  }`}
                >
                  Giảm dần
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Không có học viên nào khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Họ tên</th>
                <th className="px-4 py-3 font-medium sm:px-6">Tài khoản</th>
                <th className="px-4 py-3 font-medium sm:px-6">Cấp độ hiện tại</th>
                <th className="px-4 py-3 font-medium sm:px-6">Trạng thái</th>
                <th className="px-4 py-3 font-medium sm:px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-4 sm:px-6 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-4 sm:px-6 text-muted">
                    {student.email}
                    {student.username && (
                      <span className="block text-xs text-faint">@{student.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <LevelBadge level={student.grantedLevel} />
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/students/${student.id}`}
                        title="Xem / sửa"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {canDemote && (
                        <DemoteStudentButton studentId={student.id} studentName={student.name} iconOnly />
                      )}
                      {canLock && (
                        <ToggleStudentStatusButton
                          studentId={student.id}
                          locked={student.status === "LOCKED"}
                          iconOnly
                        />
                      )}
                      {canDelete && (
                        <DeleteStudentButton studentId={student.id} studentName={student.name} iconOnly />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
