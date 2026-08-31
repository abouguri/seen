import { formatLoggedDate } from "@/lib/dates";
import { BarChart } from "@/components/stats/BarChart";
import { copy } from "@/lib/copy";
import type { Stats } from "@/lib/types";

/**
 * The shared body for both the private stats page (app/(app)/stats/
 * page.tsx) and the public one (app/u/[userId]/stats/page.tsx) — same
 * split as FilmDetailBody/PersonFilmographyGrid, here to stop the two
 * from drifting the way the film/show detail views already had to be
 * un-drifted once (§ ROADMAP.md #2). Pure presentation: computeStats'
 * output never carries note/place/company, so this component can't leak
 * them even by accident.
 */
export function StatsBody({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-8">
      {stats.filmsPerYear.length > 0 && (
        <Section title={copy.stats.filmsPerYear}>
          <BarChart data={stats.filmsPerYear.map((d) => ({ label: String(d.year), count: d.count }))} />
        </Section>
      )}

      {stats.decadesWatched.length > 0 && (
        <Section title={copy.stats.decadesWatched}>
          <BarChart data={stats.decadesWatched.map((d) => ({ label: `${d.decade}s`, count: d.count }))} />
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
