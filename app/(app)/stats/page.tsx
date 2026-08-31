import { createClient } from "@/lib/supabase/server";
import { computeStats, type EpisodeEntryRow, type MovieEntryRow, type ShowEntryRow } from "@/lib/stats/compute";
import { StatsBody } from "@/components/stats/StatsBody";
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
      <StatsBody stats={stats} />
    </div>
  );
}
