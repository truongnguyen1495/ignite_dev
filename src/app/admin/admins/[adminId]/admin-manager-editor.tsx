"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setAdminManagerAction } from "../actions";

export function AdminManagerEditor({
  adminId,
  initialIsAdminManager,
  initialCanManageAdmins,
}: {
  adminId: string;
  initialIsAdminManager: boolean;
  initialCanManageAdmins: boolean;
}) {
  const router = useRouter();
  const [isAdminManager, setIsAdminManager] = useState(initialIsAdminManager);
  const [canManageAdmins, setCanManageAdmins] = useState(initialCanManageAdmins);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  // What is currently on the server, as far as this component knows. There is
  // no <form> here to hang an onChange off, so "has anything changed?" is
  // derived by comparing the live checkboxes against this instead of being
  // tracked with a flag. Deriving it also handles the case a flag cannot: tick
  // a box and untick it again and the button goes back to "Đã lưu" on its own,
  // because nothing actually differs any more.
  const [saved, setSaved] = useState({
    isAdminManager: initialIsAdminManager,
    canManageAdmins: initialCanManageAdmins,
  });
  const isDirty = isAdminManager !== saved.isAdminManager || canManageAdmins !== saved.canManageAdmins;

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await setAdminManagerAction(adminId, isAdminManager, canManageAdmins);
      if (result) {
        setError(result);
        return;
      }
      // Only moved on success — leaving it untouched after a failed save keeps
      // the button reading "Lưu thay đổi" so the change is visibly still owed.
      setSaved({ isAdminManager, canManageAdmins });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
        <input
          type="checkbox"
          checked={isAdminManager}
          onChange={(e) => {
            setIsAdminManager(e.target.checked);
            if (!e.target.checked) setCanManageAdmins(false);
          }}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          <span className="block font-medium text-foreground">Đề cử làm Admin Manager</span>
          <span className="block text-xs text-muted">
            Có toàn bộ quyền nội dung như Super Admin — trừ trang Cài đặt.
          </span>
        </span>
      </label>
      {isAdminManager && (
        <label className="ml-6 flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover">
          <input
            type="checkbox"
            checked={canManageAdmins}
            onChange={(e) => setCanManageAdmins(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block font-medium text-foreground">Cho phép Quản lý Admin</span>
            <span className="block text-xs text-muted">
              Được vào /admin/admins để tạo/cấp lại quyền cho admin thường khác. Không áp dụng cho Super Admin hay
              Admin Manager khác.
            </span>
          </span>
        </label>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="button"
        onClick={handleSave}
        variant={isDirty ? "primary" : "secondary"}
        disabled={pending || !isDirty}
        isLoading={pending}
      >
        {pending ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
      </Button>
    </div>
  );
}
