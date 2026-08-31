import { createClient } from "@/lib/supabase/server";
import { computeStats, type EpisodeEntryRow, type MovieEntryRow, type ShowEntryRow } from "@/lib/stats/compute";
import { StatsBody } from "@/components/stats/StatsBody";
import { YearNav } from "@/components/stats/YearNav";
import { CopyLinkButton } from "@/components/stats/CopyLinkButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { copy } from "@/lib/copy";

/**
 * A year-scoped slice of /stats (§ ROADMAP.md #7) — computeStats() is
 * unmodified; the only change from the all-time page is the watched_on
 * range added to each query below. That range naturally excludes
 * era/unknown-precision entries (watched_on is null for those) without
 * a separate precision check.
 */
export default async function StatsYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);

  if (!Number.isInteger(year) || year < 1888 || year > new Date().getFullYear() + 1) {
    return <EmptyState tone="error" title={copy.stats.loadFailed} />;
  }

  const rangeStart = `${year}-01-01`;
  const rangeEnd = `${year}-12-31`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [movies, shows, episodes, settings] = await Promise.all([
    supabase
      .from("watch_entries")
      .select("id, film_id, watched_on, created_at, films(title, runtime, directors, release_year)")
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
    supabase
      .from("show_watch_entries")
      .select("id, show_id, watched_on, created_at, shows(name, first_air_year)")
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
    supabase
      .from("episode_watch_entries")
      .select("id, show_id, episode_id, watched_on, created_at, shows(name, first_air_year), episodes(runtime)")
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
    user
      ? supabase.from("user_settings").select("public_stats").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (movies.error || shows.error || episodes.error) {
    return <EmptyState tone="error" title={copy.stats.loadFailed} />;
  }

  const movieEntries = (movies.data ?? []) as unknown as MovieEntryRow[];
  const showEntries = (shows.data ?? []) as unknown as ShowEntryRow[];
  const episodeEntries = (episodes.data ?? []) as unknown as EpisodeEntryRow[];

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-display-1">{copy.stats.yearInReview(year)}</h1>
        {settings?.data?.public_stats && user && (
          <CopyLinkButton path={`/u/${user.id}/stats/${year}`} />
        )}
      </div>

      <YearNav year={year} basePath="/stats" />

      {movieEntries.length === 0 && showEntries.length === 0 && episodeEntries.length === 0 ? (
        <EmptyState title={copy.stats.emptyTitle} body={copy.stats.emptyMessage} />
      ) : (
        <StatsBody stats={computeStats(movieEntries, showEntries, episodeEntries)} />
      )}
    </div>
  );
}
