import { createClient } from "@/lib/supabase/server";
import {
  findTmdbDirectorId,
  fetchTmdbDirectedFilms,
  fetchTmdbActingFilms,
  TmdbError,
} from "@/lib/tmdb/client";
import { isPresentable } from "@/lib/recommendations/engine";
import { PersonFilmographyGrid } from "@/components/people/PersonFilmographyGrid";
import { copy } from "@/lib/copy";
import type { TmdbSearchResult } from "@/lib/tmdb/raw-types";

/**
 * Reachable from any director/cast link (components/library/PersonLinks.tsx).
 * Reuses the exact name→TMDB-person resolution the homepage's "complete
 * the director" shelf already does (lib/recommendations/engine.ts), just
 * without that function's homepage-only gating (≥2 films already logged,
 * top-6 cap, dismissed-recommendation filtering, "only the single best
 * director") — this page already knows exactly which person it's for.
 *
 * Scoped to film directors and film cast only — TMDB has no equivalent
 * person-credits endpoint for "created a TV show," so show creators stay
 * plain text rather than linking here to a page that couldn't show
 * anything relevant for them.
 */
export default async function PersonPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: nameParam } = await params;
  const name = decodeURIComponent(nameParam);

  let personId: number | null;
  let directed: TmdbSearchResult[];
  let acted: TmdbSearchResult[];
  try {
    personId = await findTmdbDirectorId(name);
    if (personId === null) {
      return <ErrorState message={copy.errors.personNotFound} />;
    }
    [directed, acted] = await Promise.all([
      fetchTmdbDirectedFilms(personId),
      fetchTmdbActingFilms(personId),
    ]);
  } catch (err) {
    if (err instanceof TmdbError) {
      return <ErrorState message={copy.errors.tmdbUnreachable} />;
    }
    throw err;
  }

  const directingFilms = directed.filter(isPresentable).map(toFilmographyItem);
  const actingFilms = acted.filter(isPresentable).map(toFilmographyItem);

  if (directingFilms.length === 0 && actingFilms.length === 0) {
    return <ErrorState message={copy.people.empty} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entryRows } = user
    ? await supabase.from("watch_entries").select("film_id").eq("user_id", user.id)
    : { data: [] };
  const loggedFilmIds = new Set((entryRows ?? []).map((row) => row.film_id));

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-16 md:px-9">
      <h1 className="text-display-1">{name}</h1>

      <PersonFilmographyGrid heading={copy.people.asDirector} films={directingFilms} loggedFilmIds={loggedFilmIds} />
      <PersonFilmographyGrid heading={copy.people.asActor} films={actingFilms} loggedFilmIds={loggedFilmIds} />
    </div>
  );
}

function toFilmographyItem(result: TmdbSearchResult) {
  const year = result.release_date ? Number.parseInt(result.release_date.slice(0, 4), 10) : null;
  return {
    id: result.id,
    title: result.title,
    year: year !== null && Number.isFinite(year) ? year : null,
    posterPath: result.poster_path,
  };
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <p className="text-body text-danger max-w-[32ch] text-center">{message}</p>
    </div>
  );
}
