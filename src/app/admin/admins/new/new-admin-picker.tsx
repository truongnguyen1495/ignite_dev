"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  searchAccountsForPermissionAction,
  createAdminAccountAction,
  type AccountSearchResult,
} from "../actions";

export function NewAdminPicker() {
  const router = useRouter();
  const [mode, setMode] = useState<"search" | "create">("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [navPending, startNavTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
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

  function handleSelect(accountId: string) {
    startNavTransition(() => {
      router.push(`/admin/admins/${accountId}`);
    });
  }

  function handleCreate() {
    setCreateError(undefined);
    startCreateTransition(async () => {
      const result = await createAdminAccountAction({ name, email, password, adminOnly });
      if (result.error || !result.account) {
        setCreateError(result.error ?? "Không thể tạo tài khoản.");
        return;
      }
      router.push(`/admin/admins/${result.account.id}`);
    });
  }

  return (
    <Card className="space-y-4">
      <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "search" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
          }`}
        >
          Tài khoản có sẵn
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "create" ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-hover"
          }`}
        >
          Tạo tài khoản mới
        </button>
      </div>

      {mode === "search" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên, username hoặc email học viên..."
              className="w-full rounded-lg border border-border-strong bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
            )}
          </div>
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted">Không tìm thấy tài khoản nào.</p>
          )}
          <div className="space-y-1.5">
            {results.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={navPending}
                onClick={() => handleSelect(account.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-bg text-sm font-semibold text-primary">
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{account.name}</p>
                  <p className="truncate text-xs text-muted">{account.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
                  Vẫn vào được /dashboard và học bình thường, cộng thêm quyền admin bạn cấp bên trong.
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
                  Không vào được /dashboard, không hiện trong danh sách học viên — chỉ dùng để làm việc.
                </span>
              </span>
            </label>
          </div>
          <Input label="Họ tên" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Input
            label="Mật khẩu"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
          />
          {createError && <p className="text-sm text-danger">{createError}</p>}
          <Button
            type="button"
            onClick={handleCreate}
            disabled={createPending || !name.trim() || !email.trim() || password.length < 8}
            isLoading={createPending}
          >
            <UserPlus className="h-4 w-4" />
            Tạo tài khoản
          </Button>
        </div>
      )}
    </Card>
  );
}
