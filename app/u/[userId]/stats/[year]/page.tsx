import { createAdminClient } from "@/lib/supabase/admin";
import { computeStats, type EpisodeEntryRow, type MovieEntryRow, type ShowEntryRow } from "@/lib/stats/compute";
import { StatsBody } from "@/components/stats/StatsBody";
import { YearNav } from "@/components/stats/YearNav";
import { EmptyState } from "@/components/shared/EmptyState";
import { copy } from "@/lib/copy";

/**
 * The public year-scoped stats page (§ ROADMAP.md #7) — same shape as
 * app/u/[userId]/stats/page.tsx (admin client, explicit user_id filters
 * standing in for RLS, identical opt-out/nonexistent-user message), with
 * the same watched_on range app/(app)/stats/[year]/page.tsx uses.
 */
export default async function PublicStatsYearPage({
  params,
}: {
  params: Promise<{ userId: string; year: string }>;
}) {
  const { userId, year: yearParam } = await params;
  const year = Number(yearParam);

  if (!Number.isInteger(year) || year < 1888 || year > new Date().getFullYear() + 1) {
    return <NotAvailable />;
  }

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("user_settings")
    .select("public_stats")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.public_stats) {
    return <NotAvailable />;
  }

  const rangeStart = `${year}-01-01`;
  const rangeEnd = `${year}-12-31`;

  const [movies, shows, episodes] = await Promise.all([
    admin
      .from("watch_entries")
      .select("id, film_id, watched_on, created_at, films(title, runtime, directors, release_year)")
      .eq("user_id", userId)
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
    admin
      .from("show_watch_entries")
      .select("id, show_id, watched_on, created_at, shows(name, first_air_year)")
      .eq("user_id", userId)
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
    admin
      .from("episode_watch_entries")
      .select("id, show_id, episode_id, watched_on, created_at, shows(name, first_air_year), episodes(runtime)")
      .eq("user_id", userId)
      .gte("watched_on", rangeStart)
      .lte("watched_on", rangeEnd),
  ]);

  if (movies.error || shows.error || episodes.error) {
    return <NotAvailable />;
  }

  const movieEntries = (movies.data ?? []) as unknown as MovieEntryRow[];
  const showEntries = (shows.data ?? []) as unknown as ShowEntryRow[];
  const episodeEntries = (episodes.data ?? []) as unknown as EpisodeEntryRow[];

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
      <h1 className="text-display-1 mb-6">{copy.stats.yearInReview(year)}</h1>
      <YearNav year={year} basePath={`/u/${userId}/stats`} />

      {movieEntries.length === 0 && showEntries.length === 0 && episodeEntries.length === 0 ? (
        <EmptyState title={copy.stats.emptyTitle} body={copy.stats.emptyMessage} />
      ) : (
        <StatsBody stats={computeStats(movieEntries, showEntries, episodeEntries)} />
      )}
    </div>
  );
}

function NotAvailable() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <p className="text-body text-label-2 max-w-[32ch] text-center">{copy.publicStats.notAvailable}</p>
    </div>
  );
}
