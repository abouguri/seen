import Image from "next/image";
import Link from "next/link";
import { PosterThumb } from "@/components/film/PosterThumb";
import { buttonClasses } from "@/components/ui/Button";
import { DismissButton } from "@/components/home/DismissButton";
import { backdropUrl } from "@/lib/images";
import { formatRuntime } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { Recommendation } from "@/lib/recommendations/types";
import type { FilmDetail } from "@/lib/types";

/**
 * The lead, as pure presentation — everything this renders is passed in.
 *
 * Split from LeadRecommendation so the card can be rendered from
 * fixtures. The wrapper's whole job is one lookup that reaches the
 * network on a cache miss, which makes the wrapper the hardest thing on
 * the page to see, and the card the thing most worth looking at. This
 * way the second doesn't depend on the first.
 *
 * `meta` is nullable on purpose and every use of it is guarded: the
 * detail lookup is allowed to fail. The card's argument is the
 * because-line, which comes from the recommendation itself, so losing
 * "128 min" or the backdrop costs the card some richness and nothing
 * else. That is also the common case on older films, where TMDB simply
 * has no still.
 */
export function LeadCard({
  film,
  meta,
}: {
  film: Recommendation;
  meta: FilmDetail | null;
}) {
  const backdrop = meta ? backdropUrl(meta.backdropPath, "w1280") : null;

  const facts = [
    film.year !== null ? String(film.year) : null,
    meta?.directors[0] ?? null,
    meta?.runtime ? formatRuntime(meta.runtime) : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section className="border-separator bg-surface-1 squircle relative isolate overflow-hidden rounded-lg border">
      {/* Decoration, not information: alt="" deliberately. Every fact
          this still could carry is already in the text beside it. */}
      {backdrop && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* Opacity sits on the still, not on this wrapper — the veil
              is its sibling, and fading the pair together would push the
              cover back at exactly the same rate as the thing it covers,
              which is no change at all. */}
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover object-center opacity-(--lead-backdrop-opacity)"
          />
          <div className="home-lead-veil absolute inset-0" />
        </div>
      )}

      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:gap-9 sm:p-7">
        <Link
          href={`/film/${film.id}`}
          /* The poster keeps a real drop shadow here, unlike the shelf
             cards: it sits on a photographic ground rather than on flat
             surface, and without one it reads as pasted on. */
          className="w-40 shrink-0 self-start rounded-md shadow-[0_24px_50px_-16px_rgba(0,0,0,.65)] outline-offset-4 sm:w-52"
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
          <p className="text-eyebrow text-warm-text">{copy.home.leadEyebrow}</p>

          <h2 className="text-display-2 mt-3 text-balance">
            <Link href={`/film/${film.id}`} className="rounded-xs outline-offset-4">
              {film.title}
            </Link>
          </h2>

          {facts.length > 0 && (
            <p className="text-subhead text-label-2 mt-2.5">{facts.join(" · ")}</p>
          )}

          {/* The because-line. The reason this page is allowed to exist —
              so it is set at reading size in the primary label colour,
              not as the grey caption it was. */}
          <p className="text-body text-label mt-5 max-w-prose leading-6 text-pretty">
            {film.reason}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Link href={`/film/${film.id}`} className={buttonClasses()}>
              {copy.home.leadAction}
            </Link>
            <DismissButton filmId={film.id} title={film.title} />
          </div>
        </div>
      </div>
    </section>
  );
}
