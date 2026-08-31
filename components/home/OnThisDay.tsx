import Link from "next/link";
import { PosterThumb } from "@/components/film/PosterThumb";
import { copy } from "@/lib/copy";
import type { OnThisDayEntry } from "@/lib/types";

/**
 * "On this day" (§ ROADMAP.md #6) — a personal, dated moment before the
 * "what to watch next" argument below it. Never renders an empty
 * section, same rule buildRecommendations already follows for shelves.
 */
export function OnThisDay({ entries }: { entries: OnThisDayEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-350 px-4 pt-2 pb-10 md:px-9">
      <h2 className="text-display-2">{copy.home.onThisDayHeading}</h2>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry) => (
          <li key={`${entry.mediaType}-${entry.id}`}>
            <Link
              href={`/${entry.mediaType === "movie" ? "film" : "show"}/${entry.id}`}
              className="group block rounded-sm outline-offset-4"
            >
              <PosterThumb
                title={entry.title}
                year={null}
                posterPath={entry.posterPath}
                size="w342"
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 28vw, 40vw"
                className="rounded-sm transition-[translate,box-shadow] duration-(--t-card) ease-(--default-transition-timing-function) group-hover:-translate-y-1 group-hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,.55)] group-focus-visible:-translate-y-1"
              />
              <p className="text-footnote mt-2.5 font-bold">{entry.title}</p>
              <p className="text-caption text-label-2 mt-1">
                {copy.home.onThisDayYearsAgo(entry.yearsAgo)}
              </p>
              {entry.note && (
                <p className="text-caption text-label-2 mt-1 line-clamp-2 text-pretty">
                  {copy.home.onThisDayWrote} {entry.note}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
