"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Pencil, Loader2, UserPlus } from "lucide-react";
import type { AdminPermissionKind } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ORDERED_ADMIN_PERMISSIONS, ADMIN_PERMISSION_LABELS } from "@/lib/admin-permissions";
import {
  searchAccountsForPermissionAction,
  getAccountPermissionsAction,
  setAccountPermissionsAction,
  createAdminAccountAction,
  type AccountSearchResult,
} from "./actions";

type GrantedAdmin = {
  id: string;
  name: string;
  email: string;
  permissions: AdminPermissionKind[];
};

export function AdminRoleAssignment({ initialGrantedAdmins }: { initialGrantedAdmins: GrantedAdmin[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; email: string } | null>(
    null
  );
  const [editingPermissions, setEditingPermissions] = useState<Set<AdminPermissionKind>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | undefined>();
  const [createPending, startCreateTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (trimmed.length < 2) {
        if (!cancelled) setResults([]);
        return;
      }
      setSearching(true);
      const found = await searchAccountsForPermissionAction(trimmed);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  async function openEditor(account: { id: string; name: string; email: string }, known?: AdminPermissionKind[]) {
    setError(undefined);
    setEditingAccount(account);
    setQuery("");
    setResults([]);
    if (known) {
      setEditingPermissions(new Set(known));
      return;
    }
    setLoadingPermissions(true);
    const permissions = await getAccountPermissionsAction(account.id);
    setEditingPermissions(new Set(permissions));
    setLoadingPermissions(false);
  }

  function handleCreateAccount() {
    setCreateError(undefined);
    startCreateTransition(async () => {
      const result = await createAdminAccountAction({
        name: newName,
        email: newEmail,
        password: newPassword,
      });
      if (result.error || !result.account) {
        setCreateError(result.error ?? "Không thể tạo tài khoản.");
        return;
      }
      setCreatingAccount(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await openEditor(result.account, []);
    });
  }

  function togglePermission(permission: AdminPermissionKind) {
    setEditingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }

  function handleSave() {
    if (!editingAccount) return;
    startTransition(async () => {
      const result = await setAccountPermissionsAction(editingAccount.id, Array.from(editingPermissions));
      if (result) {
        setError(result);
        return;
      }
      setEditingAccount(null);
      router.refresh();
    });
  }

  function handleRevokeAll(accountId: string) {
    startTransition(async () => {
      await setAccountPermissionsAction(accountId, []);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Phân quyền quản trị viên</p>
        <p className="text-sm text-muted">
          Cấp vai trò chuyên biệt cho một tài khoản học viên — ví dụ chuyên trách khóa học, chăm sóc học
          viên, hoặc quản lý đào tạo — thay vì quyền Super Admin toàn hệ thống. Tài khoản vẫn giữ nguyên
          quyền học tập ở /dashboard.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập tên, username hoặc email học viên..."
          className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => openEditor(account)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {account.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{account.name}</p>
                <p className="truncate text-xs text-muted">{account.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!creatingAccount ? (
        <button
          type="button"
          onClick={() => setCreatingAccount(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover"
        >
          <UserPlus className="h-4 w-4" />
          Tạo tài khoản admin mới
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Tạo tài khoản admin mới</p>
            <button
              type="button"
              onClick={() => {
                setCreatingAccount(false);
                setCreateError(undefined);
              }}
              className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted">
            Tài khoản mới sẽ ở dạng học viên và chưa có quyền admin nào — bước tiếp theo bạn sẽ tick chọn
            các tính năng muốn cấp ngay sau khi tạo.
          </p>
          <Input
            label="Họ tên"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nguyễn Văn A"
          />
          <Input
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Input
            label="Mật khẩu"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
          />
          {createError && <p className="text-sm text-danger">{createError}</p>}
          <Button
            type="button"
            onClick={handleCreateAccount}
            disabled={createPending || !newName.trim() || !newEmail.trim() || newPassword.length < 8}
            isLoading={createPending}
          >
            Tạo & cấp quyền
          </Button>
        </div>
      )}

      {editingAccount && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{editingAccount.name}</p>
              <p className="truncate text-xs text-muted">{editingAccount.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingAccount(null)}
              className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {loadingPermissions ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải quyền hiện tại...
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ORDERED_ADMIN_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={editingPermissions.has(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 accent-primary"
                  />
                  {ADMIN_PERMISSION_LABELS[permission]}
                </label>
              ))}
            </div>
          )}

          <Button type="button" onClick={handleSave} disabled={pending || loadingPermissions} isLoading={pending}>
            Lưu quyền
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {initialGrantedAdmins.length === 0 ? (
          <p className="text-sm text-muted">Chưa có admin nào được phân quyền chuyên biệt.</p>
        ) : (
          initialGrantedAdmins.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{admin.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {admin.permissions.map((permission) => (
                    <Badge key={permission} color="primary">
                      {ADMIN_PERMISSION_LABELS[permission]}
                    </Badge>
                  ))}
                </div>
              </div>
              <button
                type="button"
                title="Sửa quyền"
                onClick={() => openEditor(admin, admin.permissions)}
                className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Thu hồi toàn bộ quyền"
                onClick={() => handleRevokeAll(admin.id)}
                disabled={pending}
                className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
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
