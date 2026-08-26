"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LibraryTile } from "@/components/library/LibraryTile";
import { ContextMenu, type ContextMenuItem } from "@/components/library/ContextMenu";
import { SortControl } from "@/components/library/SortControl";
import { FilterBar } from "@/components/library/FilterBar";
import { useLibraryData, type LibraryFilterState } from "@/components/library/useLibraryData";
import { useResponsiveColumns } from "@/components/library/useResponsiveColumns";
import { useRovingGrid } from "@/components/shared/useRovingGrid";
import { useCollapsingHeader, StickyInlineBar, LargeTitle } from "@/components/library/CollapsingHeader";
import { LogViewingSheet, type LogViewingInput } from "@/components/film/LogViewingSheet";
import { DetailModal } from "@/components/library/DetailModal";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import type { LibraryItem, LibrarySort } from "@/lib/types";

const GAP_PX = 8;
const VIRTUALIZE_THRESHOLD = 300;
// Title (text-subhead, 20px line-height) + year (text-footnote, 18px) +
// the tile's gap-1.5 (6px) below the poster — must match LibraryTile's
// actual rendered height or virtualized rows clip/overlap.
const TITLE_BLOCK_PX = 44;
const SORT_VALUES: LibrarySort[] = ["recent_added", "recent_watched", "release_year", "rating", "title"];

function parseSort(value: string | null): LibrarySort {
  return SORT_VALUES.includes(value as LibrarySort) ? (value as LibrarySort) : "recent_added";
}

function parseFilters(params: URLSearchParams): LibraryFilterState {
  const decade = params.get("decade");
  const rated = params.get("rated");
  const mediaType = params.get("mediaType");
  return {
    mediaType: mediaType === "movie" || mediaType === "show" || mediaType === "all" ? mediaType : undefined,
    decade: decade ? Number(decade) : undefined,
    genre: params.get("genre") ?? undefined,
    director: params.get("director") ?? undefined,
    tag: params.get("tag") ?? undefined,
    rated: rated === "rated" || rated === "unrated" ? rated : undefined,
  };
}

function countLabel(mediaType: LibraryFilterState["mediaType"], total: number): string {
  const suffix = total === 1 ? "" : "s";
  if (mediaType === "show") return `show${suffix}`;
  if (mediaType === "movie") return `film${suffix}`;
  return `title${suffix}`;
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
      mediaType: next.mediaType && next.mediaType !== "all" ? next.mediaType : undefined,
      decade: next.decade !== undefined ? String(next.decade) : undefined,
      genre: next.genre,
      director: next.director,
      tag: next.tag,
      rated: next.rated,
    });
  }

  const [menu, setMenu] = useState<{ film: LibraryItem; x: number; y: number } | null>(null);
  const [openItem, setOpenItem] = useState<LibraryItem | null>(null);
  const [logItem, setLogItem] = useState<LibraryItem | null>(null);
  const [removeItem, setRemoveItem] = useState<LibraryItem | null>(null);

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
  const rowHeight = tileWidth > 0 ? tileWidth * 1.5 + TITLE_BLOCK_PX + GAP_PX : 200;
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

  // One mutation for both media types — POSTs to /api/entries or
  // /api/show-entries depending on the item, mirroring the same body
  // shape each of those routes expects.
  const logMutation = useMutation({
    mutationFn: async ({ item, input }: { item: LibraryItem; input: LogViewingInput }) => {
      const endpoint = item.mediaType === "movie" ? "/api/entries" : "/api/show-entries";
      const body =
        item.mediaType === "movie" ? { ...input, filmId: item.id } : { ...input, showId: item.id };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
      return res.json();
    },
    onError: () => showToast(copy.errors.entrySaveFailed),
  });

  const removeMutation = useMutation({
    mutationFn: async (item: LibraryItem) => {
      const query = item.mediaType === "show" ? "?mediaType=show" : "";
      const res = await fetch(`/api/library/${item.id}${query}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
      return res.json();
    },
    onMutate: async (item: LibraryItem) => {
      removeFilmFromList(item.mediaType, item.id);
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
          onSelect: () => setLogItem(menu.film),
        },
        {
          label: copy.library.contextMenu.edit,
          onSelect: () => setOpenItem(menu.film),
        },
        {
          label: copy.library.contextMenu.remove,
          onSelect: () => setRemoveItem(menu.film),
          destructive: true,
        },
      ]
    : [];

  const rows = useMemo(() => {
    const result: LibraryItem[][] = [];
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

        <div className="flex items-center justify-between gap-3 px-4 pb-3 md:px-8">
          <p className="text-subhead text-label-2 shrink-0">
            {total} {countLabel(filters.mediaType, total)}
          </p>
          <SortControl value={sort} onChange={setSort} />
        </div>

        <div className="px-4 pb-4 md:px-8">
          <FilterBar value={filters} onChange={setFilters} />
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
                          onOpen={(f) => setOpenItem(f)}
                          onQuickLog={(f) => setLogItem(f)}
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
                  onOpen={(f) => setOpenItem(f)}
                  onQuickLog={(f) => setLogItem(f)}
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

      <DetailModal item={openItem} onClose={() => setOpenItem(null)} />

      {logItem && (
        <LogViewingSheet
          key={`${logItem.mediaType}-${logItem.id}`}
          open={Boolean(logItem)}
          onClose={() => setLogItem(null)}
          onSubmit={(input) => {
            logMutation.mutate({ item: logItem, input });
            setLogItem(null);
          }}
          showTags={logItem.mediaType === "movie"}
        />
      )}

      <ConfirmSheet
        open={Boolean(removeItem)}
        title={
          removeItem ? copy.library.removeConfirmTitle(removeItem.title, removeItem.watchCount) : ""
        }
        body={copy.library.removeConfirmBody}
        confirmLabel={copy.library.removeAction}
        onConfirm={() => removeItem && removeMutation.mutate(removeItem)}
        onClose={() => setRemoveItem(null)}
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
