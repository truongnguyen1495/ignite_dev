"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatVND } from "@/lib/currency";
import type { RevenueDailyPoint } from "@/lib/revenue";

// Thin, non-clickable variant of admin/revenue/revenue-day-chart.tsx — a
// vendor has no per-day order list to drill into the way /admin/orders?date=
// does, so this drops the onClick/router.push wiring and keeps just the
// shared visual language (same bar/tooltip/label treatment).
function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as RevenueDailyPoint;
  return (
    <div className="rounded-lg border border-border-strong bg-surface-hover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">Ngày {point.label}</p>
      <p className="font-semibold text-foreground tabular-nums">{formatVND(point.amount)}</p>
    </div>
  );
}

export function VendorRevenueChart({ data }: { data: RevenueDailyPoint[] }) {
  const MIN_BAR_PX = 10;
  const minChartWidth = Math.max(320, data.length * MIN_BAR_PX);
  const targetLabelCount = Math.max(3, Math.floor(minChartWidth / 55));
  const labelStride = Math.max(1, Math.ceil(data.length / targetLabelCount));

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${minChartWidth}px` }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 20, left: 4, bottom: 0 }} barCategoryGap={data.length > 40 ? "10%" : "20%"}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(247, 242, 231, 0.4)", fontSize: 10.5 }}
              interval={0}
              tickFormatter={(value: string, index: number) =>
                index === data.length - 1 || index % labelStride === 0 ? value : ""
              }
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip content={CustomTooltip} cursor={{ fill: "rgba(247,242,231,0.06)" }} />
            <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
              {data.map((point) => (
                <Cell key={point.dateISO} fill={point.isToday ? "var(--info)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
