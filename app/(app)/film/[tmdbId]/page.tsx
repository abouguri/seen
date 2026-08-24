import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getFilmDetail } from "@/lib/tmdb/get-detail";
import { posterUrl, backdropUrl } from "@/lib/images";
import { formatRuntime } from "@/lib/dates";
import { copy } from "@/lib/copy";
import { ViewingHistory } from "@/components/film/ViewingHistory";
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
  }));

  const backdrop = backdropUrl(detail.backdropPath, "w1280");
  const poster = posterUrl(detail.posterPath, "w500");

  const metaParts = [
    detail.year ? String(detail.year) : null,
    detail.directors.length ? detail.directors.join(", ") : null,
    formatRuntime(detail.runtime),
  ].filter(Boolean);

  return (
    <div className="flex flex-1 flex-col pb-10">
      <div className="relative">
        {backdrop ? (
          <div className="relative h-[32vh] min-h-[200px] w-full overflow-hidden">
            <Image src={backdrop} alt="" fill priority className="object-cover" />
            <div className="from-bg via-bg/70 absolute inset-0 bg-gradient-to-t to-transparent" />
          </div>
        ) : (
          <div className="h-16" />
        )}

        <div className="relative -mt-16 flex gap-4 px-4 md:px-8">
          <div className="bg-surface-2 aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md md:w-36">
            {poster ? (
              <Image
                src={poster}
                alt={`${detail.title} (${detail.year ?? "unknown year"}) poster`}
                width={342}
                height={513}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center">
                {detail.title}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-end pb-2">
            <h1 className="text-title-1">{detail.title}</h1>
            {metaParts.length > 0 && (
              <p className="text-subhead text-label-2 mt-1">{metaParts.join(" · ")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 px-4 md:px-8">
        <ViewingHistory filmId={detail.id} initialEntries={entries} />

        {detail.overview && (
          <details className="border-separator mt-8 border-t pt-4">
            <summary className="text-headline cursor-pointer">{copy.film.synopsis}</summary>
            <p className="text-body text-label-2 mt-3">{detail.overview}</p>
          </details>
        )}
      </div>
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
