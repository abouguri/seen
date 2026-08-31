import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  findTmdbDirectorId,
  fetchTmdbDirectedFilms,
  fetchTmdbActingFilms,
  fetchTmdbPersonDetail,
  TmdbError,
} from "@/lib/tmdb/client";
import { isPresentable } from "@/lib/recommendations/engine";
import { PersonFilmographyGrid } from "@/components/people/PersonFilmographyGrid";
import { initials } from "@/components/film/CastList";
import { profileUrl } from "@/lib/images";
import { copy } from "@/lib/copy";
import type { TmdbPersonDetail, TmdbSearchResult } from "@/lib/tmdb/raw-types";

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
  let detail: TmdbPersonDetail;
  let directed: TmdbSearchResult[];
  let acted: TmdbSearchResult[];
  try {
    personId = await findTmdbDirectorId(name);
    if (personId === null) {
      return <ErrorState message={copy.errors.personNotFound} />;
    }
    [detail, directed, acted] = await Promise.all([
      fetchTmdbPersonDetail(personId),
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

  // Derived from what this page actually found, not TMDB's own
  // known_for_department — the eyebrow only ever claims what the
  // filmography grids below it can back up.
  const departmentLabel =
    directingFilms.length > 0 && actingFilms.length > 0
      ? copy.people.directorAndActor
      : directingFilms.length > 0
        ? copy.people.director
        : copy.people.actor;

  const birthYear = detail.birthday ? Number.parseInt(detail.birthday.slice(0, 4), 10) : null;
  const bornLine =
    birthYear !== null && Number.isFinite(birthYear)
      ? detail.place_of_birth
        ? `Born ${birthYear} · ${detail.place_of_birth}`
        : `Born ${birthYear}`
      : null;

  const avatar = profileUrl(detail.profile_path, "w185");
  const backdrop = profileUrl(detail.profile_path, "h632");
  const bio = detail.biography?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entryRows } = user
    ? await supabase.from("watch_entries").select("film_id").eq("user_id", user.id)
    : { data: [] };
  const loggedFilmIds = new Set((entryRows ?? []).map((row) => row.film_id));

  return (
    <div className="flex flex-1 flex-col pb-16">
      <div className="relative h-[28vh] min-h-[180px] w-full overflow-hidden">
        <div className="bg-surface-2 absolute inset-0" />
        {backdrop && (
          // A profile photo is a portrait stretched across a short wide
          // band — object-cover alone crops in tight on the eyes and
          // reads as a mistake. Blurred and scaled up, the same crop
          // reads as a deliberate soft-focus atmosphere instead, the way
          // the poster-detail page's own veil already softens its edges.
          <Image
            src={backdrop}
            alt=""
            fill
            className="relative scale-110 object-cover object-top blur-md"
          />
        )}
        <div className="from-bg via-bg/70 absolute inset-0 bg-gradient-to-t to-transparent" />
      </div>

      <div className="relative -mt-16 flex gap-5 px-4 md:px-9">
        <div className="border-bg relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4">
          {avatar ? (
            <Image src={avatar} alt="" fill sizes="128px" className="object-cover" />
          ) : (
            <div
              className="bg-surface-2 text-label-2 text-display-2 flex h-full w-full items-center justify-center"
              role="img"
              aria-label={name}
            >
              {initials(name)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-end pb-2">
          <p className="text-eyebrow text-warm-text">{departmentLabel}</p>
          <h1 className="text-display-1 mt-1">{name}</h1>
          {bornLine && <p className="text-subhead text-label-2 mt-1">{bornLine}</p>}
        </div>
      </div>

      {bio && (
        <p className="text-body text-label-2 mt-6 line-clamp-4 max-w-prose px-4 leading-relaxed text-pretty md:px-9">
          {bio}
        </p>
      )}

      <div className="px-4 md:px-9">
        <PersonFilmographyGrid heading={copy.people.asDirector} films={directingFilms} loggedFilmIds={loggedFilmIds} />
        <PersonFilmographyGrid heading={copy.people.asActor} films={actingFilms} loggedFilmIds={loggedFilmIds} />
      </div>
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
