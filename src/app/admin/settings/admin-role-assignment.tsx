"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";

type AdminRole = "COURSE_MANAGER" | "CUSTOMER_CARE" | "TRAINING_MANAGER";

const ROLE_LABELS: Record<AdminRole, string> = {
  COURSE_MANAGER: "Quản lý khóa học",
  CUSTOMER_CARE: "Chăm sóc học viên",
  TRAINING_MANAGER: "Quản lý đào tạo",
};

const ROLE_COLORS: Record<AdminRole, BadgeColor> = {
  COURSE_MANAGER: "info",
  CUSTOMER_CARE: "success",
  TRAINING_MANAGER: "primary",
};

type AssignedAdmin = {
  id: string;
  name: string;
  role: AdminRole;
};

export function AdminRoleAssignment() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AdminRole>("COURSE_MANAGER");
  const [assigned, setAssigned] = useState<AssignedAdmin[]>([]);

  function handleAssign() {
    const name = query.trim();
    if (!name) return;
    setAssigned((prev) => [...prev, { id: crypto.randomUUID(), name, role }]);
    setQuery("");
  }

  function handleRevoke(id: string) {
    setAssigned((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Phân quyền quản trị viên</p>
        <p className="text-sm text-muted">
          Cấp vai trò chuyên biệt cho một tài khoản — ví dụ chuyên trách khóa học, chăm sóc học viên,
          hoặc quản lý đào tạo — thay vì quyền Super Admin toàn hệ thống.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên, username hoặc email..."
            className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="w-52 shrink-0">
          <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={handleAssign} disabled={!query.trim()}>
          Cấp quyền
        </Button>
      </div>

      <div className="space-y-2">
        {assigned.length === 0 ? (
          <p className="text-sm text-muted">Chưa có admin nào được phân quyền chuyên biệt.</p>
        ) : (
          assigned.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">{admin.name}</p>
              <Badge color={ROLE_COLORS[admin.role]}>{ROLE_LABELS[admin.role]}</Badge>
              <button
                type="button"
                title="Thu hồi quyền"
                onClick={() => handleRevoke(admin.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-bg hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
