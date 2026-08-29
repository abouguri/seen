import Link from "next/link";
import { PosterThumb } from "@/components/film/PosterThumb";
import { buttonClasses } from "@/components/ui/Button";
import { DismissButton } from "@/components/home/DismissButton";
import { getFilmDetail } from "@/lib/tmdb/get-detail";
import { formatRuntime } from "@/lib/dates";
import type { Recommendation } from "@/lib/recommendations/types";

/**
 * The lead: one film, argued. Not a carousel — the page opens by making
 * a single case properly rather than by fanning out twenty options.
 *
 * Director and runtime come from getFilmDetail, which reads the films
 * table first and only reaches TMDB on a miss (refreshing in the
 * background when stale). So the extra metadata this section shows costs
 * one indexed row read on the common path, not a network round trip.
 * When that lookup fails the section still renders — the argument is the
 * because-line, and losing "128 min" is not a reason to drop it.
 *
 * "Add to library" is a link, not a button that posts: adding a film in
 * SEEN means logging a viewing of it, and the film page is where that
 * happens. Rendering it as an anchor keeps middle-click, open-in-new-tab
 * and the status-bar URL, which is exactly what buttonClasses exists for.
 */
export async function LeadRecommendation({ film }: { film: Recommendation }) {
  const detail = await getFilmDetail(film.id);
  const meta = detail.status === "ok" ? detail.film : null;

  const facts = [
    film.year !== null ? String(film.year) : null,
    meta?.directors[0] ?? null,
    meta?.runtime ? formatRuntime(meta.runtime) : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section className="border-separator bg-surface-1/60 squircle rounded-lg border p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Link
          href={`/film/${film.id}`}
          className="focus-visible:outline-accent w-40 shrink-0 self-start rounded-md outline-offset-4 sm:w-52"
        >
          <PosterThumb
            title={film.title}
            year={film.year}
            posterPath={film.posterPath}
            size="w342"
            sizes="(min-width: 640px) 208px, 160px"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-eyebrow text-label-3">The one to watch next</p>

          <h2 className="text-display-2 mt-2">
            <Link
              href={`/film/${film.id}`}
              className="focus-visible:outline-accent rounded-xs outline-offset-4"
            >
              {film.title}
            </Link>
          </h2>

          {facts.length > 0 && (
            <p className="text-subhead text-label-2 mt-2">{facts.join(" · ")}</p>
          )}

          {/* The because-line. The reason this page is allowed to exist. */}
          <p className="text-body text-label-2 mt-4 max-w-prose text-pretty">{film.reason}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href={`/film/${film.id}`} className={buttonClasses()}>
              Add to library
            </Link>
            <DismissButton filmId={film.id} title={film.title} />
          </div>
        </div>
      </div>
    </section>
  );
}
