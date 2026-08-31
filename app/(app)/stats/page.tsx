import { createClient } from "@/lib/supabase/server";
import { computeStats, type EpisodeEntryRow, type MovieEntryRow, type ShowEntryRow } from "@/lib/stats/compute";
import { formatLoggedDate } from "@/lib/dates";
import { BarChart } from "@/components/stats/BarChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { copy } from "@/lib/copy";

export default async function StatsPage() {
  const supabase = await createClient();
  const [movies, shows, episodes] = await Promise.all([
    supabase
      .from("watch_entries")
      .select("id, film_id, watched_on, created_at, films(title, runtime, directors, release_year)"),
    supabase
      .from("show_watch_entries")
      .select("id, show_id, watched_on, created_at, shows(name, first_air_year)"),
    supabase
      .from("episode_watch_entries")
      .select("id, show_id, episode_id, watched_on, created_at, shows(name, first_air_year), episodes(runtime)"),
  ]);

  if (movies.error || shows.error || episodes.error) {
    return (
      <EmptyState tone="error" title={copy.stats.loadFailed} />
    );
  }

  const movieEntries = (movies.data ?? []) as unknown as MovieEntryRow[];
  const showEntries = (shows.data ?? []) as unknown as ShowEntryRow[];
  const episodeEntries = (episodes.data ?? []) as unknown as EpisodeEntryRow[];

  if (movieEntries.length === 0 && showEntries.length === 0 && episodeEntries.length === 0) {
    return (
      <EmptyState title={copy.stats.emptyTitle} body={copy.stats.emptyMessage} />
    );
  }

  const stats = computeStats(movieEntries, showEntries, episodeEntries);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
      <h1 className="text-display-1 mb-6">{copy.stats.title}</h1>

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
