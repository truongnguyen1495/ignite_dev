"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarRectangleItem,
  type TooltipContentProps,
} from "recharts";
import { formatVND } from "@/lib/currency";
import type { RevenueDailyPoint } from "@/lib/revenue";

// TooltipProps (recharts' own public prop type) deliberately omits
// active/payload/label — recharts 3 reads those from context instead. The
// type a custom `content` render actually receives is TooltipContentProps,
// which re-adds them with their real runtime shape.
function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as RevenueDailyPoint;
  return (
    <div className="rounded-lg border border-border-strong bg-surface-hover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">Ngày {point.label}</p>
      <p className="font-semibold text-foreground tabular-nums">{formatVND(point.amount)}</p>
      <p className="mt-1 text-[11px] text-primary-hover">Bấm để xem đơn hàng ngày này →</p>
    </div>
  );
}

/**
 * Bar chart of daily paid revenue, one bar per VN calendar day in the
 * selected period. Bars are clickable — recharts renders them as SVG shapes
 * rather than real anchors, so this uses onClick + router.push instead of a
 * <Link> (the breakdown cards and top-products table elsewhere on this page
 * are plain server-rendered rows and use real <Link>s; this is the one
 * exception, forced by the charting library).
 */
export function RevenueDayChart({ data }: { data: RevenueDailyPoint[] }) {
  const router = useRouter();

  // recharts hands the Bar's rendered rectangle geometry to onClick, not the
  // data row itself — the original datum rides along on `.payload`.
  function handleBarClick(bar: BarRectangleItem) {
    const point = bar.payload as RevenueDailyPoint | undefined;
    if (!point) return;
    router.push(`/admin/orders?date=${point.dateISO}`);
  }

  // A quarter's ~90 bars squeezed into a 375px phone screen would be a few
  // px wide each — too thin to read or tap. Give the chart a floor width (one
  // day never renders below MIN_BAR_PX) and let the card scroll horizontally
  // instead of shrinking bars further; short ranges (today/7d/month) stay
  // under this floor and render at the full container width, no scrollbar.
  const MIN_BAR_PX = 10;
  const minChartWidth = Math.max(320, data.length * MIN_BAR_PX);

  // Labels are thinned to roughly one every ~55px of actual chart width
  // (a "DD/MM" label is ~30px wide, so this leaves real breathing room) —
  // sized off minChartWidth, not just data.length, because a narrow phone
  // still renders at the 320px floor even for a short range like "month"'s
  // 22 bars; targeting a fixed label *count* there packed labels so tight
  // they overlapped into unreadable digit soup. The last (today's) label
  // always shows regardless of stride, so "today" stays legible.
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
            <Bar dataKey="amount" radius={[3, 3, 0, 0]} onClick={handleBarClick} cursor="pointer">
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
