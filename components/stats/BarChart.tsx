type BarChartProps = {
  data: { label: string; count: number }[];
};

// Fixed pixel cap for the bar itself, kept separate from the count/label
// text around it — so a bar's height is computed as an exact fraction of
// this constant instead of a CSS percentage of an ambient flex height
// (which was rendering the shortest bar taller than its true share; a
// 1-vs-2 count read as ~1.4x instead of 2x).
const BAR_MAX_PX = 128;

/**
 * Plain CSS bars — no chart library heavier than two bar charts justify
 * (§6.8). Each bar's height is a true zero-baseline fraction of the max
 * value; label and count are real text underneath, not just a tooltip,
 * so the chart reads fine at any Dynamic Type size and to a screen reader.
 */
export function BarChart({ data }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex items-end gap-1 overflow-x-auto">
      {data.map((d) => (
        <div key={d.label} className="flex min-w-[28px] flex-1 flex-col items-center gap-1.5">
          <span className="text-caption text-label-2">{d.count}</span>
          <div
            className="bg-accent w-full rounded-t-sm"
            style={{ height: Math.round((d.count / max) * BAR_MAX_PX) }}
          />
          <span className="text-caption text-label-2">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
