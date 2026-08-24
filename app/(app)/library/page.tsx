"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LibraryTile } from "@/components/library/LibraryTile";
import { ContextMenu, type ContextMenuItem } from "@/components/library/ContextMenu";
import { SortSheet } from "@/components/library/SortSheet";
import { FilterSheet } from "@/components/library/FilterSheet";
import { useLibraryData, type LibraryFilterState } from "@/components/library/useLibraryData";
import { useResponsiveColumns } from "@/components/library/useResponsiveColumns";
import { useRovingGrid } from "@/components/shared/useRovingGrid";
import { useCollapsingHeader, StickyInlineBar, LargeTitle } from "@/components/library/CollapsingHeader";
import { LogViewingSheet, type LogViewingInput } from "@/components/film/LogViewingSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import type { LibraryFilm, LibrarySort } from "@/lib/types";

const GAP_PX = 8;
const VIRTUALIZE_THRESHOLD = 300;
const SORT_VALUES: LibrarySort[] = ["recent_added", "recent_watched", "release_year", "rating", "title"];

function parseSort(value: string | null): LibrarySort {
  return SORT_VALUES.includes(value as LibrarySort) ? (value as LibrarySort) : "recent_added";
}

function parseFilters(params: URLSearchParams): LibraryFilterState {
  const decade = params.get("decade");
  const rated = params.get("rated");
  return {
    decade: decade ? Number(decade) : undefined,
    genre: params.get("genre") ?? undefined,
    director: params.get("director") ?? undefined,
    tag: params.get("tag") ?? undefined,
    rated: rated === "rated" || rated === "unrated" ? rated : undefined,
  };
}

function LibraryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sort/filter live in the URL (fix 3) — so navigating to a film and
  // back restores the library exactly, via ordinary browser history.
  const sort = parseSort(searchParams.get("sort"));
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setSort(next: LibrarySort) {
    updateParams({ sort: next === "recent_added" ? undefined : next });
  }

  function setFilters(next: LibraryFilterState) {
    updateParams({
      decade: next.decade !== undefined ? String(next.decade) : undefined,
      genre: next.genre,
      director: next.director,
      tag: next.tag,
      rated: next.rated,
    });
  }

  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [menu, setMenu] = useState<{ film: LibraryFilm; x: number; y: number } | null>(null);
  const [logFilm, setLogFilm] = useState<LibraryFilm | null>(null);
  const [removeFilm, setRemoveFilm] = useState<LibraryFilm | null>(null);

  const { films, total, loading, error, loadMore, reload, removeFilm: removeFilmFromList } =
    useLibraryData(sort, filters);
  const { showToast } = useToast();

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useCollapsingHeader(scrollRef, barRef, titleRef);

  const { columns, containerWidth } = useResponsiveColumns(gridRef);
  const { activeIndex, setActiveIndex, setItemRef, handleKeyDown } = useRovingGrid(
    films.length,
    columns,
  );
  const tileWidth = columns > 0 ? (containerWidth - GAP_PX * (columns - 1)) / columns : 0;
  const rowHeight = tileWidth > 0 ? tileWidth * 1.5 + GAP_PX : 200;
  const rowCount = Math.ceil(films.length / columns);
  const shouldVirtualize = films.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
    enabled: shouldVirtualize,
  });

  // Recompute row measurements when the tile size changes (resize/columns).
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight, virtualizer]);

  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : null;

  // Infinite pagination — trigger the next page when scrolled near the
  // end, whether virtualized or not.
  useEffect(() => {
    const lastVisibleRow = virtualRows
      ? (virtualRows[virtualRows.length - 1]?.index ?? 0)
      : rowCount - 1;
    if (lastVisibleRow >= rowCount - 3) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualRows, rowCount]);

  function handleScroll() {
    if (!shouldVirtualize) return;
    const lastVisibleRow = virtualizer.getVirtualItems().at(-1)?.index ?? 0;
    if (lastVisibleRow >= rowCount - 3) loadMore();
  }

  const logMutation = useMutation({
    mutationFn: async (input: LogViewingInput & { filmId: number }) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
      return res.json();
    },
    onError: () => showToast(copy.errors.entrySaveFailed),
  });

  const removeMutation = useMutation({
    mutationFn: async (filmId: number) => {
      const res = await fetch(`/api/library/${filmId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
      return res.json();
    },
    onMutate: async (filmId: number) => {
      removeFilmFromList(filmId);
    },
    onError: () => {
      showToast(copy.errors.entrySaveFailed);
      reload();
    },
  });

  const menuItems: ContextMenuItem[] = menu
    ? [
        {
          label: copy.library.contextMenu.logAnother,
          onSelect: () => setLogFilm(menu.film),
        },
        {
          label: copy.library.contextMenu.edit,
          onSelect: () => router.push(`/film/${menu.film.id}`),
        },
        {
          label: copy.library.contextMenu.remove,
          onSelect: () => setRemoveFilm(menu.film),
          destructive: true,
        },
      ]
    : [];

  const rows = useMemo(() => {
    const result: LibraryFilm[][] = [];
    for (let i = 0; i < films.length; i += columns) {
      result.push(films.slice(i, i + columns));
    }
    return result;
  }, [films, columns]);

  const isEmpty = !loading && films.length === 0;
  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <StickyInlineBar ref={barRef} title={copy.library.title} />

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <LargeTitle ref={titleRef} title={copy.library.title} />

        <div className="flex items-center justify-between px-4 pb-4 md:px-8">
          <p className="text-subhead text-label-2">
            {total} film{total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSortOpen(true)}>
              {copy.library.sortLabel}
            </Button>
            <Button variant="secondary" onClick={() => setFilterOpen(true)}>
              {copy.library.filterLabel}
              {hasActiveFilters ? " •" : ""}
            </Button>
          </div>
        </div>

        {error && films.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-4 px-4 text-center">
            <p className="text-body text-danger max-w-[32ch]">{copy.errors.libraryLoadFailed}</p>
            <Button variant="secondary" onClick={reload}>
              {copy.errors.retry}
            </Button>
          </div>
        )}

        {isEmpty && !error && (
          <p className="text-body text-label-2 mt-8 px-4 text-center">
            {hasActiveFilters ? copy.library.noResultsForFilter : copy.library.emptyMessage}
          </p>
        )}

        <div ref={gridRef} className="px-4 md:px-8">
          {shouldVirtualize ? (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                  >
                    {rows[virtualRow.index]?.map((film, colIndex) => {
                      const index = virtualRow.index * columns + colIndex;
                      return (
                        <LibraryTile
                          key={film.id}
                          film={film}
                          onContextMenu={(f, x, y) => setMenu({ film: f, x, y })}
                          tileRef={setItemRef(index)}
                          tabIndex={index === activeIndex ? 0 : -1}
                          onKeyDown={(event) => handleKeyDown(event, index)}
                          onFocus={() => setActiveIndex(index)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {films.map((film, index) => (
                <LibraryTile
                  key={film.id}
                  film={film}
                  onContextMenu={(f, x, y) => setMenu({ film: f, x, y })}
                  tileRef={setItemRef(index)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onFocus={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      <SortSheet open={sortOpen} value={sort} onChange={setSort} onClose={() => setSortOpen(false)} />
      <FilterSheet
        open={filterOpen}
        value={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />

      {logFilm && (
        <LogViewingSheet
          key={logFilm.id}
          open={Boolean(logFilm)}
          onClose={() => setLogFilm(null)}
          onSubmit={(input) => {
            logMutation.mutate({ ...input, filmId: logFilm.id });
            setLogFilm(null);
          }}
        />
      )}

      <ConfirmSheet
        open={Boolean(removeFilm)}
        title={
          removeFilm ? copy.library.removeConfirmTitle(removeFilm.title, removeFilm.watchCount) : ""
        }
        body={copy.library.removeConfirmBody}
        confirmLabel={copy.library.removeAction}
        onConfirm={() => removeFilm && removeMutation.mutate(removeFilm.id)}
        onClose={() => setRemoveFilm(null)}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryContent />
    </Suspense>
  );
}
