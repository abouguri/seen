import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PosterThumb } from "@/components/film/PosterThumb";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { CompanyMatch, WatchPrecision } from "@/lib/types";

type MovieCompanyRow = {
  watched_on: string | null;
  precision: WatchPrecision;
  era_label: string | null;
  films: { id: number; title: string; release_year: number | null; poster_path: string | null } | null;
};

type ShowCompanyRow = {
  watched_on: string | null;
  precision: WatchPrecision;
  era_label: string | null;
  shows: { id: number; name: string; first_air_year: number | null; poster_path: string | null } | null;
};

/**
 * "Who with" (§ ROADMAP.md #6) — every viewing can record who you
 * watched it with, but nothing aggregated it. Built entirely from the
 * user's own entries, no TMDB involved: reached by tapping a company
 * name in ViewingHistory/ShowViewingHistory (components/library's
 * "sibling, not nested" Link constraint — see those files). Matching is
 * exact string, same convention /library?director= already uses.
 */
export default async function WithCompanyPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company: companyParam } = await params;
  const company = decodeURIComponent(companyParam);

  const supabase = await createClient();

  const [moviesResult, showsResult] = await Promise.all([
    supabase
      .from("watch_entries")
      .select("watched_on, precision, era_label, films(id, title, release_year, poster_path)")
      .eq("company", company),
    supabase
      .from("show_watch_entries")
      .select("watched_on, precision, era_label, shows(id, name, first_air_year, poster_path)")
      .eq("company", company),
  ]);

  const movieRows = (moviesResult.data ?? []) as unknown as MovieCompanyRow[];
  const showRows = (showsResult.data ?? []) as unknown as ShowCompanyRow[];

  const movies: CompanyMatch[] = movieRows
    .filter((row) => row.films !== null)
    .map((row) => ({
      mediaType: "movie" as const,
      id: row.films!.id,
      title: row.films!.title,
      year: row.films!.release_year,
      posterPath: row.films!.poster_path,
      watchedOn: row.watched_on,
      precision: row.precision,
      eraLabel: row.era_label,
    }));

  const shows: CompanyMatch[] = showRows
    .filter((row) => row.shows !== null)
    .map((row) => ({
      mediaType: "show" as const,
      id: row.shows!.id,
      title: row.shows!.name,
      year: row.shows!.first_air_year,
      posterPath: row.shows!.poster_path,
      watchedOn: row.watched_on,
      precision: row.precision,
      eraLabel: row.era_label,
    }));

  const matches = [...movies, ...shows].sort((a, b) =>
    (b.watchedOn ?? "").localeCompare(a.watchedOn ?? ""),
  );

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-16 md:px-9">
      <h1 className="text-display-1">{copy.with.heading(company)}</h1>

      {matches.length === 0 ? (
        <p className="text-body text-label-2 mt-6">{copy.with.empty}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-3 gap-3.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {matches.map((match) => (
            <li key={`${match.mediaType}-${match.id}`}>
              <Link
                href={`/${match.mediaType === "movie" ? "film" : "show"}/${match.id}`}
                className="block rounded-sm outline-offset-2"
              >
                <PosterThumb title={match.title} year={match.year} posterPath={match.posterPath} size="w342" sizes="16vw" />
                <p className="text-footnote mt-1.5 truncate font-bold">{match.title}</p>
                <p className="text-caption text-label-2">{formatWatchedDate(match)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
