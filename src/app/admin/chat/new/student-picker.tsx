"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { searchStudentsForSupportAction, startSupportThreadAction } from "../actions";

type StudentResult = { id: string; name: string; username: string | null };

export function StudentPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const found = await searchStudentsForSupportAction(trimmed);
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

  const visibleResults = query.trim().length >= 2 ? results : [];

  function handleSelect(studentId: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await startSupportThreadAction(studentId);
      if (result) setError(result);
    });
  }

  return (
    <Card className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập tên, username hoặc email..."
          className="w-full rounded-lg border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {searching && (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tìm...
        </p>
      )}
      {!searching && query.trim().length >= 2 && visibleResults.length === 0 && (
        <p className="text-sm text-muted">Không tìm thấy học viên nào.</p>
      )}
      <div className="space-y-1.5">
        {visibleResults.map((student) => (
          <button
            key={student.id}
            type="button"
            disabled={pending}
            onClick={() => handleSelect(student.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {student.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{student.name}</p>
              {student.username && <p className="truncate text-xs text-muted">@{student.username}</p>}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
