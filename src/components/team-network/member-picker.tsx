"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { compareNames, type NetworkMemberLite } from "@/lib/network-tree";

// SearchableSelect treats "" as "nothing chosen", which would make clearing a
// leader impossible once one is picked — so "nobody" is a real option with its
// own value, mapped to null on the way out.
const NONE = "__none__";

// Picks one member by name or RapidX ID. People who must not be offered (the
// member themself and everyone below them, which would close a loop) are left
// out of the list entirely rather than shown disabled.
export function MemberPicker({
  id,
  label,
  members,
  value,
  onChange,
  noneLabel,
  excluded,
  hint,
  disabled = false,
}: {
  id: string;
  label: string;
  members: readonly NetworkMemberLite[];
  value: string | null;
  onChange: (value: string | null) => void;
  noneLabel: string;
  excluded?: ReadonlySet<string>;
  hint?: string;
  disabled?: boolean;
}) {
  const options = useMemo(
    () => [
      { value: NONE, label: noneLabel },
      ...members
        .filter((m) => !excluded?.has(m.id))
        .sort((a, b) => compareNames(a.name, b.name))
        .map((m) => ({ value: m.id, label: m.igniteId ? `${m.name} · ${m.igniteId}` : m.name })),
    ],
    [members, excluded, noneLabel]
  );

  return (
    <div>
      <SearchableSelect
        id={id}
        label={label}
        options={options}
        value={value ?? NONE}
        onChange={(next) => onChange(next === NONE ? null : next)}
        placeholder={noneLabel}
        searchPlaceholder="Tìm tên hoặc RapidX ID…"
        emptyText="Không có ai khớp."
        disabled={disabled}
      />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
