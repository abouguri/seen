"use client";

import { useMemo, useState } from "react";
import { PersonFilmographyGrid, type FilmographyItem } from "@/components/people/PersonFilmographyGrid";
import { PersonSortControl } from "@/components/people/PersonSortControl";
import { copy } from "@/lib/copy";
import type { PersonFilmographySort } from "@/lib/types";

type PersonFilmographyProps = {
  directingFilms: FilmographyItem[];
  actingFilms: FilmographyItem[];
  loggedFilmIds: Set<number>;
};

function sortFilms(films: FilmographyItem[], sort: PersonFilmographySort): FilmographyItem[] {
  const sorted = [...films];
  if (sort === "title") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }
  // Era/unknown-year credits (shorts, TV movies with no confirmed date)
  // sink to the end regardless of direction, rather than clustering at
  // whichever end null happens to sort to numerically.
  sorted.sort((a, b) => {
    if (a.year === null) return b.year === null ? 0 : 1;
    if (b.year === null) return -1;
    return sort === "newest" ? b.year - a.year : a.year - b.year;
  });
  return sorted;
}

/** Owns the one sort choice that applies to both filmography grids —
 *  the filmography is small and fully loaded already (a TMDB credits
 *  call, not a paginated fetch), so re-sorting is a client-side re-order
 *  of the existing arrays, never a re-fetch. */
export function PersonFilmography({ directingFilms, actingFilms, loggedFilmIds }: PersonFilmographyProps) {
  const [sort, setSort] = useState<PersonFilmographySort>("newest");

  const sortedDirecting = useMemo(() => sortFilms(directingFilms, sort), [directingFilms, sort]);
  const sortedActing = useMemo(() => sortFilms(actingFilms, sort), [actingFilms, sort]);

  return (
    <div>
      <div className="mt-10 flex justify-end">
        <PersonSortControl value={sort} onChange={setSort} />
      </div>
      <PersonFilmographyGrid heading={copy.people.asDirector} films={sortedDirecting} loggedFilmIds={loggedFilmIds} />
      <PersonFilmographyGrid heading={copy.people.asActor} films={sortedActing} loggedFilmIds={loggedFilmIds} />
    </div>
  );
}
