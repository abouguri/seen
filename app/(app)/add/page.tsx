"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { YearScroller } from "@/components/wall/YearScroller";
import { PosterTile } from "@/components/wall/PosterTile";
import { SkeletonTile } from "@/components/wall/SkeletonTile";
import { AddBar } from "@/components/wall/AddBar";
import { usePosterWall } from "@/components/wall/use-poster-wall";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { useToast } from "@/components/ui/Toast";
import { useResponsiveColumns } from "@/components/library/useResponsiveColumns";
import { useRovingGrid } from "@/components/shared/useRovingGrid";
import type { FilmSummary } from "@/lib/types";

const SKELETON_COUNT = 12;

/**
 * TMDB's discover pagination can return the same film on adjacent pages
 * (popularity-score ties near a page boundary) — deduping keeps film.id
 * a valid React key and avoids ever rendering the same tile twice.
 */
function dedupeById(films: FilmSummary[]): FilmSummary[] {
  const seen = new Set<number>();
  return films.filter((film) => {
    if (seen.has(film.id)) return false;
    seen.add(film.id);
    return true;
  });
}

export default function AddPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [films, setFilms] = useState<FilmSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { tiles, mergeSeen, toggle, addedCount, isOffline } = usePosterWall();
  const { showToast } = useToast();
  const { columns } = useResponsiveColumns(gridRef);
  const { activeIndex, setActiveIndex, setItemRef, handleKeyDown } = useRovingGrid(
    films.length,
    columns,
  );

  const loadFirstPage = useCallback((forYear: number) => {
    setFilms([]);
    setPage(1);
    setHasMore(true);
    setError(false);
    setLoading(true);

    fetch(`/api/tmdb/discover?year=${forYear}&page=1`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as FilmSummary[];
      })
      .then((data) => {
        setFilms(dedupeById(data));
        mergeSeen(data);
        setHasMore(data.length > 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // mergeSeen is stable in practice (from a hook without memo) — omitting
    // it from deps avoids re-running this on every unrelated render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFirstPage(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const loadNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;

    fetch(`/api/tmdb/discover?year=${year}&page=${nextPage}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as FilmSummary[];
      })
      .then((data) => {
        setFilms((prev) => dedupeById([...prev, ...data]));
        mergeSeen(data);
        setPage(nextPage);
        setHasMore(data.length > 0);
      })
      .catch(() => {
        // A pagination failure isn't the primary-content-missing case —
        // the wall still works with what's loaded, so this is a toast,
        // not the full inline error state.
        showToast(copy.errors.tmdbUnreachable);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, page, year]);

  useEffect(() => {
    if (!hasMore || loading || error) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPage();
      },
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error, loadNextPage]);

  return (
    <div className="flex flex-1 flex-col pb-24 md:pb-8">
      <div className="pt-4 md:pt-8">
        <h1 className="text-large-title px-4 md:px-8">{copy.wall.title}</h1>
        <div className="mt-4">
          <YearScroller year={year} onChange={setYear} />
        </div>
        {isOffline && (
          <p className="text-footnote text-label-2 bg-surface-1 mx-4 mt-4 rounded-md px-3 py-2 md:mx-8">
            {copy.wall.offline}
          </p>
        )}
      </div>

      {error && films.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 px-4 text-center">
          <p className="text-body text-danger max-w-[32ch]">{copy.errors.tmdbUnreachable}</p>
          <Button variant="secondary" onClick={() => loadFirstPage(year)}>
            {copy.errors.retry}
          </Button>
        </div>
      ) : (
        <>
          <div
            ref={gridRef}
            className="grid grid-cols-3 gap-2 px-4 pt-4 sm:grid-cols-4 md:px-8 lg:grid-cols-6 xl:grid-cols-8"
          >
            {films.map((film, index) => {
              const tile = tiles.get(film.id) ?? {
                selected: film.seen,
                removable: film.hasPosterWallEntry,
              };
              return (
                <PosterTile
                  key={film.id}
                  film={film}
                  tileRef={setItemRef(index)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onFocus={() => setActiveIndex(index)}
                  selected={tile.selected}
                  removable={tile.removable}
                  onToggle={(filmId) => toggle(filmId, year)}
                />
              );
            })}
            {loading &&
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonTile key={`skeleton-${i}`} />
              ))}
          </div>

          {!loading && films.length === 0 && (
            <p className="text-body text-label-2 mt-8 px-4 text-center">{copy.wall.noResults}</p>
          )}

          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        </>
      )}

      <AddBar count={addedCount} />
    </div>
  );
}
