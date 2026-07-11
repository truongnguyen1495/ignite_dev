"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPermissionKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  ORDERED_ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  STUDENT_PERMISSION_GROUPS,
} from "@/lib/admin-permissions";
import { setAccountPermissionsAction } from "../actions";

export function AdminPermissionEditor({
  adminId,
  initialAdminOnly,
  initialPermissions,
}: {
  adminId: string;
  initialAdminOnly: boolean;
  initialPermissions: AdminPermissionKind[];
}) {
  const router = useRouter();
  const [adminOnly, setAdminOnly] = useState(initialAdminOnly);
  const [permissions, setPermissions] = useState<Set<AdminPermissionKind>>(new Set(initialPermissions));
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function togglePermission(permission: AdminPermissionKind) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }

  // Unchecking a group's parent (e.g. "Học viên") also clears its children
  // ("Sửa/Khóa/Xóa học viên") — they'd be unreachable/meaningless anyway
  // once the admin can't even view that page, so leaving them checked but
  // orphaned would just be confusing on the next visit to this screen.
  function toggleGroupParent(parent: AdminPermissionKind, children: AdminPermissionKind[]) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(parent)) {
        next.delete(parent);
        for (const child of children) next.delete(child);
      } else {
        next.add(parent);
      }
      return next;
    });
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await setAccountPermissionsAction(adminId, Array.from(permissions), adminOnly);
      if (result) {
        setError(result);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Loại tài khoản</p>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
          <input
            type="radio"
            checked={!adminOnly}
            onChange={() => setAdminOnly(false)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className="block font-medium text-foreground">Vừa học vừa admin</span>
            <span className="block text-xs text-muted">
              Vẫn vào được /dashboard và học bình thường, cộng thêm quyền admin bên dưới.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
          <input
            type="radio"
            checked={adminOnly}
            onChange={() => setAdminOnly(true)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className="block font-medium text-foreground">Chỉ làm admin</span>
            <span className="block text-xs text-muted">
              Không vào được /dashboard, không hiện trong danh sách học viên.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Tính năng được cấp quyền</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ORDERED_ADMIN_PERMISSIONS.map((permission) => (
            <label
              key={permission}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                checked={permissions.has(permission)}
                onChange={() => togglePermission(permission)}
                className="h-4 w-4 accent-primary"
              />
              {ADMIN_PERMISSION_LABELS[permission]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STUDENT_PERMISSION_GROUPS.map(({ parent, children }) => {
          const parentChecked = permissions.has(parent);
          return (
            <div key={parent} className="space-y-2 rounded-lg border border-border px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={parentChecked}
                  onChange={() => toggleGroupParent(parent, children)}
                  className="h-4 w-4 accent-primary"
                />
                {ADMIN_PERMISSION_LABELS[parent]}
              </label>
              {parentChecked && (
                <div className="ml-6 space-y-1.5 border-l border-border pl-3">
                  {children.map((child) => (
                    <label
                      key={child}
                      className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.has(child)}
                        onChange={() => togglePermission(child)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      {ADMIN_PERMISSION_LABELS[child]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={pending} isLoading={pending}>
        Lưu thay đổi
      </Button>
    </div>
  );
}
