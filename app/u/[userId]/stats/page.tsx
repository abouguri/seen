import { createAdminClient } from "@/lib/supabase/admin";
import { computeStats, type EpisodeEntryRow, type MovieEntryRow, type ShowEntryRow } from "@/lib/stats/compute";
import { StatsBody } from "@/components/stats/StatsBody";
import { EmptyState } from "@/components/shared/EmptyState";
import { copy } from "@/lib/copy";

/**
 * The opt-in public stats page (§ ROADMAP.md #9) — the one route in the
 * app reachable with no session (see lib/supabase/middleware.ts's
 * PUBLIC_PATHS). Uses the admin client throughout, deliberately: an
 * anonymous visitor has no auth.uid(), so RLS can't scope anything for
 * them — every query here supplies an explicit .eq("user_id", userId)
 * in RLS's place. computeStats() is unmodified and safe by construction:
 * its output never carries note/place/company.
 *
 * A missing user_settings row, a false flag, and a nonexistent userId
 * all render the identical message below — this page can't be used to
 * probe which ids/emails have accounts.
 */
export default async function PublicStatsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("user_settings")
    .select("public_stats")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.public_stats) {
    return <NotAvailable />;
  }

  const [movies, shows, episodes] = await Promise.all([
    admin
      .from("watch_entries")
      .select("id, film_id, watched_on, created_at, films(title, runtime, directors, release_year)")
      .eq("user_id", userId),
    admin
      .from("show_watch_entries")
      .select("id, show_id, watched_on, created_at, shows(name, first_air_year)")
      .eq("user_id", userId),
    admin
      .from("episode_watch_entries")
      .select("id, show_id, episode_id, watched_on, created_at, shows(name, first_air_year), episodes(runtime)")
      .eq("user_id", userId),
  ]);

  if (movies.error || shows.error || episodes.error) {
    return <NotAvailable />;
  }

  const movieEntries = (movies.data ?? []) as unknown as MovieEntryRow[];
  const showEntries = (shows.data ?? []) as unknown as ShowEntryRow[];
  const episodeEntries = (episodes.data ?? []) as unknown as EpisodeEntryRow[];

  if (movieEntries.length === 0 && showEntries.length === 0 && episodeEntries.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
        <h1 className="text-display-1 mb-6">{copy.stats.title}</h1>
        <EmptyState title={copy.stats.emptyTitle} body={copy.stats.emptyMessage} />
      </div>
    );
  }

  const stats = computeStats(movieEntries, showEntries, episodeEntries);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-9">
      <h1 className="text-display-1 mb-6">{copy.stats.title}</h1>
      <StatsBody stats={stats} />
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
