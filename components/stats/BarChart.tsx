type BarChartProps = {
  data: { label: string; count: number }[];
};

/**
 * Plain CSS bars — no chart library heavier than two bar charts justify
 * (§6.8). Each bar's height is its share of the max value; label and
 * count are real text underneath, not just a tooltip, so the chart reads
 * fine at any Dynamic Type size and to a screen reader.
 */
export function BarChart({ data }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto">
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-[28px] flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-caption text-label-2">{d.count}</span>
          <div
            className="bg-accent w-full rounded-t-sm"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
          <span className="text-caption text-label-3">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
