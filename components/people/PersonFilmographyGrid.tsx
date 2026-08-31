import Link from "next/link";
import { PosterThumb } from "@/components/film/PosterThumb";
import { copy } from "@/lib/copy";

export type FilmographyItem = { id: number; title: string; year: number | null; posterPath: string | null };

type PersonFilmographyGridProps = {
  heading: string;
  films: FilmographyItem[];
  loggedFilmIds: Set<number>;
};

/** One "As director"/"As actor" section on a person page — a poster
 *  grid linking each title to its film page, with the same "Seen" badge
 *  treatment components/search/SearchPanel.tsx already uses. */
export function PersonFilmographyGrid({ heading, films, loggedFilmIds }: PersonFilmographyGridProps) {
  if (films.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-display-2">
        {heading} <span className="text-label-2">· {films.length}</span>
      </h2>
      <ul className="mt-5 grid grid-cols-3 gap-3.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {films.map((film) => (
          <li key={film.id}>
            <Link href={`/film/${film.id}`} className="block rounded-sm outline-offset-2">
              <div className="relative">
                <PosterThumb title={film.title} year={film.year} posterPath={film.posterPath} size="w342" sizes="16vw" />
                {loggedFilmIds.has(film.id) && (
                  <span className="bg-warm text-on-warm text-caption absolute top-2 left-2 rounded-full px-2 py-0.5 font-extrabold">
                    {copy.search.seenLabel}
                  </span>
                )}
              </div>
              <p className="text-footnote mt-1.5 truncate font-bold">{film.title}</p>
              <p className="text-caption text-label-2">{film.year ?? ""}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
