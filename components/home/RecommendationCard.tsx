import Link from "next/link";
import { PosterThumb } from "@/components/film/PosterThumb";
import { copy } from "@/lib/copy";
import type { Recommendation } from "@/lib/recommendations/types";

/**
 * One recommended film. The because-line sits under the title and is not
 * optional — it is the whole differentiator, so it is rendered from a
 * required field rather than passed in by each shelf.
 *
 * Hover is the library's: translateY(-4px) plus a shadow at --t-card,
 * and deliberately not a scale. Growing a poster shoves its neighbours
 * around in a dense grid and reads as "preview this" rather than "open
 * this" — the same reasoning LibraryTile carries.
 *
 * A rewatch card says so out loud. It is the one card on the page whose
 * film is already in the library, and without the badge it reads as the
 * dedupe having failed.
 */
export function RecommendationCard({ film }: { film: Recommendation }) {
  return (
    <li>
      <Link href={`/film/${film.id}`} className="group block rounded-sm outline-offset-4">
        <div className="relative transition-[translate,box-shadow] duration-(--t-card) ease-(--default-transition-timing-function) group-hover:-translate-y-1 group-hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,.55)] group-focus-visible:-translate-y-1">
          <PosterThumb
            title={film.title}
            year={film.year}
            posterPath={film.posterPath}
            size="w342"
            sizes="(min-width: 1280px) 15vw, (min-width: 640px) 22vw, 40vw"
            className="rounded-sm"
          />
          {film.isRewatch && (
            <span className="bg-scrim/70 text-caption border-separator-strong text-label absolute top-2 left-2 rounded-full border px-2 py-0.5 font-bold backdrop-blur-md">
              {copy.home.rewatchBadge}
            </span>
          )}
        </div>

        <p className="text-footnote mt-2.5 font-bold">
          {film.title}
          {film.year !== null && <span className="text-label-3 font-normal"> {film.year}</span>}
        </p>
        <p className="text-caption text-label-2 mt-1 text-pretty">{film.reason}</p>
      </Link>
    </li>
  );
}
