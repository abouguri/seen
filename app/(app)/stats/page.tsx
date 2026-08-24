import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/stats/compute";
import { formatLoggedDate } from "@/lib/dates";
import { BarChart } from "@/components/stats/BarChart";
import { copy } from "@/lib/copy";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_entries")
    .select("id, film_id, watched_on, created_at, films(title, runtime, directors)");

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-body text-danger max-w-[32ch] text-center">{copy.stats.loadFailed}</p>
      </div>
    );
  }

  const entries = (data ?? []) as unknown as Parameters<typeof computeStats>[0];

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-body text-label-2 max-w-[32ch] text-center">{copy.stats.emptyMessage}</p>
      </div>
    );
  }

  const stats = computeStats(entries);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-8">
      <h1 className="text-large-title mb-6">{copy.stats.title}</h1>

      <div className="flex flex-col gap-8">
        {stats.filmsPerYear.length > 0 && (
          <Section title={copy.stats.filmsPerYear}>
            <BarChart
              data={stats.filmsPerYear.map((d) => ({ label: String(d.year), count: d.count }))}
            />
          </Section>
        )}

        {stats.decadesWatched.length > 0 && (
          <Section title={copy.stats.decadesWatched}>
            <BarChart
              data={stats.decadesWatched.map((d) => ({ label: `${d.decade}s`, count: d.count }))}
            />
          </Section>
        )}

        {stats.mostSeenDirectors.length > 0 && (
          <Section title={copy.stats.mostSeenDirectors}>
            <ul className="flex flex-col gap-2">
              {stats.mostSeenDirectors.map((d) => (
                <li key={d.name} className="flex items-center justify-between">
                  <span className="text-body">{d.name}</span>
                  <span className="text-body text-label-2">{d.count}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Stat label={copy.stats.totalHours} value={stats.totalHours.toLocaleString()} />
          {stats.longestGap && (
            <Stat
              label={copy.stats.longestGap}
              value={stats.longestGap.title}
              detail={copy.stats.daysSuffix(stats.longestGap.days)}
            />
          )}
          {stats.firstLogged && (
            <Stat
              label={copy.stats.firstLogged}
              value={stats.firstLogged.title}
              detail={formatLoggedDate(stats.firstLogged.createdAt)}
            />
          )}
          {stats.lastLogged && (
            <Stat
              label={copy.stats.lastLogged}
              value={stats.lastLogged.title}
              detail={formatLoggedDate(stats.lastLogged.createdAt)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-title-2 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="bg-surface-1 rounded-md p-4">
      <p className="text-footnote text-label-2 mb-1">{label}</p>
      <p className="text-headline truncate">{value}</p>
      {detail && <p className="text-footnote text-label-2 mt-0.5">{detail}</p>}
    </div>
  );
}
