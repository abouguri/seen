"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { YearScroller } from "@/components/wall/YearScroller";
import { PosterTile } from "@/components/wall/PosterTile";
import { SkeletonTile } from "@/components/wall/SkeletonTile";
import { AddBar } from "@/components/wall/AddBar";
import { usePosterWall } from "@/components/wall/use-poster-wall";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { useToast } from "@/components/ui/Toast";
import { useResponsiveColumns, WALL_COLUMNS } from "@/components/library/useResponsiveColumns";
import { useRovingGrid } from "@/components/shared/useRovingGrid";
import type { FilmSummary, ShowSummary } from "@/lib/types";

const SKELETON_COUNT = 12;
type Mode = "movie" | "show";

/**
 * TMDB's discover pagination can return the same title on adjacent pages
 * (popularity-score ties near a page boundary) — deduping keeps id
 * a valid React key and avoids ever rendering the same tile twice.
 */
function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function AddPage() {
  const [mode, setMode] = useState<Mode>("movie");

  return (
    <div className="flex flex-1 flex-col pb-28 md:pb-20">
      <div className="px-4 pt-8 md:px-9">
        <p className="text-eyebrow text-label-2">{copy.add.eyebrow}</p>
        <h1 className="text-display-1 mt-2.5">
          {copy.add.headlineLead}{" "}
          <span className="text-warm-text">{copy.add.headlineAccent}</span>
        </h1>
        <div className="mt-6">
          <Segmented
            options={[
              { value: "movie" as const, label: copy.library.filter.movies },
              { value: "show" as const, label: copy.library.filter.shows },
            ]}
            value={mode}
            onChange={setMode}
            aria-label={copy.library.filter.typeFieldLabel}
          />
        </div>
      </div>
      {/* Remounts the whole wall on mode switch — a movie wall and a
          show wall are genuinely different data sources (different
          discover endpoint, different TMDB id namespace), and
          usePosterWall's kind is meant to be fixed for a mounted
          instance's lifetime, not flipped under it. */}
      <AddPageContent key={mode} mode={mode} />
    </div>
  );
}

function AddPageContent({ mode }: { mode: Mode }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [items, setItems] = useState<(FilmSummary | ShowSummary)[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { tiles, mergeSeen, toggle, addedCount, isOffline } = usePosterWall(mode);
  const { showToast } = useToast();
  const { columns } = useResponsiveColumns(gridRef, WALL_COLUMNS);
  const { activeIndex, setActiveIndex, setItemRef, handleKeyDown } = useRovingGrid(
    items.length,
    columns,
  );

  const discoverUrl = mode === "movie" ? "/api/tmdb/discover" : "/api/tmdb/discover-shows";

  const loadFirstPage = useCallback(
    (forYear: number) => {
      setItems([]);
      setPage(1);
      setHasMore(true);
      setError(false);
      setLoading(true);

      fetch(`${discoverUrl}?year=${forYear}&page=1`)
        .then(async (res) => {
          if (!res.ok) throw new Error();
          return (await res.json()) as (FilmSummary | ShowSummary)[];
        })
        .then((data) => {
          setItems(dedupeById(data));
          mergeSeen(data);
          setHasMore(data.length > 0);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    },
    // mergeSeen is stable in practice (from a hook without memo) — omitting
    // it from deps avoids re-running this on every unrelated render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoverUrl],
  );

  useEffect(() => {
    loadFirstPage(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const loadNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;

    fetch(`${discoverUrl}?year=${year}&page=${nextPage}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as (FilmSummary | ShowSummary)[];
      })
      .then((data) => {
        setItems((prev) => dedupeById([...prev, ...data]));
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
  }, [loading, hasMore, page, year, discoverUrl]);

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
    <>
      {/* The year sits beside its own picker in display type — on this
          screen the year *is* the query, and the scroller alone reads as
          a row of equal options rather than one active choice. */}
      <div className="mt-5 flex items-center gap-4 px-4 md:px-9">
        <div className="min-w-0 flex-1">
          <YearScroller year={year} onChange={setYear} />
        </div>
        <span aria-hidden="true" className="text-figure hidden text-[2.5rem] sm:block">
          {year}
        </span>
      </div>
      {isOffline && (
        <p className="text-footnote text-label-2 bg-surface-1 border-separator mx-4 mt-4 rounded-md border px-3 py-2 md:mx-9">
          {copy.wall.offline}
        </p>
      )}

      {error && items.length === 0 ? (
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
            className="grid grid-cols-3 gap-1.5 px-4 pt-6 sm:grid-cols-5 md:px-9 lg:grid-cols-8 xl:grid-cols-10"
          >
            {items.map((item, index) => {
              const tile = tiles.get(item.id) ?? {
                selected: item.seen,
                removable: item.hasPosterWallEntry,
              };
              return (
                <PosterTile
                  key={item.id}
                  film={item}
                  tileRef={setItemRef(index)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onFocus={() => setActiveIndex(index)}
                  selected={tile.selected}
                  removable={tile.removable}
                  onToggle={(id) => toggle(id, year)}
                />
              );
            })}
            {loading &&
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonTile key={`skeleton-${i}`} />
              ))}
          </div>

          {!loading && items.length === 0 && (
            <p className="text-body text-label-2 mt-8 px-4 text-center">{copy.wall.noResults}</p>
          )}

          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        </>
      )}

      <AddBar count={addedCount} />
    </>
  );
}
