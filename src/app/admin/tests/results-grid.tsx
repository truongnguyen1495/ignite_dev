"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PersonalityTestType } from "@prisma/client";
import { ORDERED_PERSONALITY_TEST_TYPES, PERSONALITY_TEST_LABELS } from "@/lib/groups";
import { deletePersonalityResultAction, upsertPersonalityResultAction } from "./actions";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  groupName: string | null;
  results: Partial<Record<PersonalityTestType, { resultLabel: string; note: string | null }>>;
};

export type TestInfo = { id: string; type: PersonalityTestType };

export function ResultsGrid({ students, tests }: { students: StudentRow[]; tests: TestInfo[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<{ studentId: string; studentName: string; type: PersonalityTestType } | null>(null);
  const [resultValue, setResultValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const testByType = useMemo(() => new Map(tests.map((t) => [t.type, t])), [tests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [search, students]);

  const activeStudent = modal ? students.find((s) => s.id === modal.studentId) : undefined;
  const activeResult = modal ? activeStudent?.results[modal.type] : undefined;

  function openModal(student: StudentRow, type: PersonalityTestType) {
    const existing = student.results[type];
    setModal({ studentId: student.id, studentName: student.name, type });
    setResultValue(existing?.resultLabel ?? "");
    setNote(existing?.note ?? "");
    setError(undefined);
  }

  function save() {
    if (!modal) return;
    const test = testByType.get(modal.type);
    if (!test) return;
    setError(undefined);
    startTransition(async () => {
      const err = await upsertPersonalityResultAction(modal.studentId, test.id, resultValue, note);
      if (err) {
        setError(err);
        return;
      }
      setModal(null);
      router.refresh();
    });
  }

  function remove() {
    if (!modal) return;
    const test = testByType.get(modal.type);
    if (!test) return;
    startTransition(async () => {
      await deletePersonalityResultAction(modal.studentId, test.id);
      setModal(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên thành viên..."
          className="w-full max-w-xs rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <span className="text-xs text-muted">
          {filtered.length}/{students.length} thành viên
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-surface-hover text-xs font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Thành viên</th>
              {ORDERED_PERSONALITY_TEST_TYPES.map((type) => (
                <th key={type} className="px-4 py-3 text-center">
                  {PERSONALITY_TEST_LABELS[type]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="text-xs text-faint">{s.groupName ?? "Chưa có nhóm"}</div>
                </td>
                {ORDERED_PERSONALITY_TEST_TYPES.map((type) => {
                  const result = s.results[type];
                  return (
                    <td key={type} className="px-4 py-3 text-center">
                      {result ? (
                        <button
                          type="button"
                          onClick={() => openModal(s, type)}
                          className="max-w-[168px] truncate rounded-full border border-primary-border bg-primary-bg px-2.5 py-1 text-xs font-semibold text-primary"
                        >
                          {result.resultLabel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModal(s, type)}
                          className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-semibold text-faint hover:border-primary-border hover:text-primary"
                        >
                          + Nhập
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5"
          onClick={() => setModal(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wide text-faint">{PERSONALITY_TEST_LABELS[modal.type]}</p>
            <h3 className="mt-1 text-base font-bold text-foreground">
              {activeResult ? "Sửa" : "Nhập"} kết quả — {modal.studentName}
            </h3>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-foreground">Nhãn kết quả</label>
            <input
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              placeholder="Ví dụ: D — Thống trị"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-muted">Hiển thị trực tiếp trên thẻ trắc nghiệm bên dashboard thành viên.</p>

            <label className="mb-1.5 mt-4 block text-sm font-medium text-foreground">
              Ghi chú thêm <span className="font-normal text-muted">(nội bộ, không hiện cho thành viên)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[70px] w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />

            {error && <p className="mt-2 text-xs text-danger">{error}</p>}

            <div className="mt-5 flex items-center justify-between">
              {activeResult ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={remove}
                  className="text-sm font-semibold text-danger disabled:opacity-50"
                >
                  Xóa kết quả
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={pending || !resultValue.trim()}
                  onClick={save}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
