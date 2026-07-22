"use client";

import { useState } from "react";
import type { Level } from "@prisma/client";
import { ORDERED_LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { Select } from "@/components/ui/form";

// Shared by create/edit forms — three independent audiences (khách, học
// sinh, học viên), each opt-in on its own. The "học viên" level dropdown
// only appears once that checkbox is ticked; picking the lowest level
// (Cấp 1) is how "every học viên" is expressed, there's no separate
// "tất cả" option.
export function AnnouncementAudienceFields({
  defaultVisibleToGuest = false,
  defaultVisibleToProspective = false,
  defaultVisibleToLeveled = false,
  defaultMinLevel,
}: {
  defaultVisibleToGuest?: boolean;
  defaultVisibleToProspective?: boolean;
  defaultVisibleToLeveled?: boolean;
  defaultMinLevel?: Level | null;
}) {
  const [visibleToLeveled, setVisibleToLeveled] = useState(defaultVisibleToLeveled);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Đối tượng xem</p>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="visibleToGuest"
          defaultChecked={defaultVisibleToGuest}
          className="h-4 w-4 accent-primary"
        />
        Cấp quyền cho khách (chưa đăng nhập) xem
      </label>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="visibleToProspective"
          defaultChecked={defaultVisibleToProspective}
          className="h-4 w-4 accent-primary"
        />
        Cấp quyền cho học sinh xem
      </label>

      <div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="visibleToLeveled"
            checked={visibleToLeveled}
            onChange={(e) => setVisibleToLeveled(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Cấp quyền cho học viên xem
        </label>
        {visibleToLeveled && (
          <Select
            id="minLevel"
            name="minLevel"
            defaultValue={defaultMinLevel ?? ORDERED_LEVELS[0]}
            required
            label="Từ cấp nào trở lên"
            hint="Học viên từ cấp này trở lên sẽ xem được — chọn Cấp 1 nếu muốn toàn bộ học viên."
            className="mt-2"
          >
            {ORDERED_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]} trở lên
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
