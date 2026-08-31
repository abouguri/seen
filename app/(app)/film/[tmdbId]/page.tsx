import { createClient } from "@/lib/supabase/server";
import { getFilmDetail } from "@/lib/tmdb/get-detail";
import { copy } from "@/lib/copy";
import { FilmDetailBody } from "@/components/film/FilmDetailBody";
import { getEntryTags } from "@/lib/tags/resolve";
import { summarizeEntries } from "@/lib/entries";
import type { WatchEntry } from "@/lib/types";

export default async function FilmDetailPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);

  if (!Number.isInteger(id) || id <= 0) {
    return <ErrorState message={copy.errors.filmNotFound} />;
  }

  const result = await getFilmDetail(id);
  if (result.status === "not_found") {
    return <ErrorState message={copy.errors.filmNotFound} />;
  }
  if (result.status === "unreachable") {
    return <ErrorState message={copy.errors.tmdbUnreachable} />;
  }
  const detail = result.film;

  const supabase = await createClient();
  const { data: entryRows } = await supabase
    .from("watch_entries")
    .select("id, film_id, watched_on, precision, era_label, rating, note, place, company, created_at")
    .eq("film_id", id)
    .order("watched_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const tagsByEntry = await getEntryTags(
    supabase,
    (entryRows ?? []).map((row) => row.id),
  );

  const entries: WatchEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id,
    filmId: row.film_id,
    watchedOn: row.watched_on,
    precision: row.precision,
    eraLabel: row.era_label,
    rating: row.rating,
    note: row.note,
    place: row.place,
    company: row.company,
    createdAt: row.created_at,
    tags: tagsByEntry.get(row.id) ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col pb-10">
      <FilmDetailBody
        header={{ id: detail.id, title: detail.title, year: detail.year, posterPath: detail.posterPath }}
        stats={summarizeEntries(entries)}
        detail={detail}
        entries={entries}
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
