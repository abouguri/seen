import { createClient } from "@/lib/supabase/server";
import { getShowDetail } from "@/lib/tmdb/get-show-detail";
import { copy } from "@/lib/copy";
import { ShowDetailBody } from "@/components/show/ShowDetailBody";
import { summarizeEntries } from "@/lib/entries";
import type { EpisodeWatchEntry, SeasonSummary, ShowWatchEntry } from "@/lib/types";

/** Mirrors app/(app)/film/[tmdbId]/page.tsx — creators/status instead of
 *  directors/runtime (a show has no single runtime at this granularity).
 *  Renders through ShowDetailBody, the same shared body components/
 *  library/DetailPanel.tsx uses for its show branch. */
export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);

  if (!Number.isInteger(id) || id <= 0) {
    return <ErrorState message={copy.errors.showNotFound} />;
  }

  const result = await getShowDetail(id);
  if (result.status === "not_found") {
    return <ErrorState message={copy.errors.showNotFound} />;
  }
  if (result.status === "unreachable") {
    return <ErrorState message={copy.errors.tmdbUnreachable} />;
  }
  const detail = result.show;

  const supabase = await createClient();
  const { data: entryRows } = await supabase
    .from("show_watch_entries")
    .select("id, show_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .eq("show_id", id)
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const entries: ShowWatchEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id,
    showId: row.show_id,
    watchedOn: row.watched_on,
    precision: row.precision,
    eraLabel: row.era_label,
    rating: row.rating,
    note: row.note,
    place: row.place,
    company: row.company,
    createdAt: row.created_at,
  }));

  const { data: seasonRows } = await supabase
    .from("seasons")
    .select("id, show_id, season_number, name, episode_count, poster_path")
    .eq("show_id", id)
    .order("season_number", { ascending: true });

  const seasons: SeasonSummary[] = (seasonRows ?? []).map((row) => ({
    id: row.id,
    showId: row.show_id,
    seasonNumber: row.season_number,
    name: row.name,
    episodeCount: row.episode_count,
    posterPath: row.poster_path,
  }));

  const { data: episodeEntryRows } = await supabase
    .from("episode_watch_entries")
    .select(
      "id, show_id, season_number, episode_id, watched_on, precision, era_label, rating, note, place, company, created_at",
    )
    .eq("show_id", id);

  const episodeEntries: EpisodeWatchEntry[] = (episodeEntryRows ?? []).map((row) => ({
    id: row.id,
    showId: row.show_id,
    seasonNumber: row.season_number,
    episodeId: row.episode_id,
    watchedOn: row.watched_on,
    precision: row.precision,
    eraLabel: row.era_label,
    rating: row.rating,
    note: row.note,
    place: row.place,
    company: row.company,
    createdAt: row.created_at,
  }));

  return (
    <div className="flex flex-1 flex-col pb-10">
      <ShowDetailBody
        header={{ id: detail.id, title: detail.title, year: detail.year, posterPath: detail.posterPath }}
        stats={summarizeEntries(entries)}
        detail={detail}
        entries={entries}
        seasons={seasons}
        episodeEntries={episodeEntries}
        headingLevel="h1"
      />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <p className="text-body text-danger max-w-[32ch] text-center">{message}</p>
    </div>
  );
}
