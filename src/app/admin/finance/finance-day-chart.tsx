"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatVND } from "@/lib/currency";
import type { FinanceDailyPoint } from "@/lib/finance";

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as FinanceDailyPoint;
  return (
    <div className="rounded-lg border border-border-strong bg-surface-hover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">
        Ngày {point.label}
        {point.isToday && " · hôm nay"}
      </p>
      <p className="mt-1 font-semibold text-success tabular-nums">Thu {formatVND(point.income)}</p>
      <p className="font-semibold text-danger tabular-nums">Chi {formatVND(point.expense)}</p>
    </div>
  );
}

/**
 * Grouped bar chart, two series (Thu/Chi) per VN calendar day — same shape
 * as RevenueDayChart but paired rather than single-series, since this page
 * has no single per-day drill-down target to route a bar click to (a day's
 * "income" bar can be a mix of many orders plus manual entries at once).
 */
export function FinanceDayChart({ data }: { data: FinanceDailyPoint[] }) {
  // Same floor-width + label-thinning reasoning as RevenueDayChart: a
  // quarter's ~90 days squeezed onto a phone screen renders unreadable bars,
  // so short ranges stay full-width while long ones scroll horizontally.
  const MIN_BAR_PX = 16;
  const minChartWidth = Math.max(320, data.length * MIN_BAR_PX);
  const targetLabelCount = Math.max(3, Math.floor(minChartWidth / 55));
  const labelStride = Math.max(1, Math.ceil(data.length / targetLabelCount));

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${minChartWidth}px` }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 20, left: 4, bottom: 0 }} barGap={1} barCategoryGap={data.length > 30 ? "20%" : "32%"}>
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
            <Bar dataKey="income" fill="var(--success)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expense" fill="var(--danger)" radius={[2, 2, 0, 0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
