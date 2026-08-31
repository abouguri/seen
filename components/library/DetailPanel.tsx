"use client";

import { useEffect, useState } from "react";
import { SidePanel } from "@/components/ui/SidePanel";
import { FilmDetailBody } from "@/components/film/FilmDetailBody";
import { ShowDetailBody } from "@/components/show/ShowDetailBody";
import type {
  LibraryItem,
  FilmDetail,
  ShowDetail,
  WatchEntry,
  ShowWatchEntry,
} from "@/lib/types";

type DetailPanelProps = {
  item: LibraryItem | null;
  onClose: () => void;
  onRemoved: (item: LibraryItem) => void;
  onRematched: () => void;
};

/**
 * The library grid's "click a poster" flow, as a right-edge panel
 * instead of a full page navigation — poster/title/year/rating/count are
 * already known (they're right there in the grid item, LibraryItem), so
 * those render the instant it opens with zero fetch. Only the backdrop,
 * synopsis, meta line (director/runtime or creators/status) and viewing
 * history need a request, and each streams in independently as soon as
 * its own fetch resolves rather than gating the whole panel on the
 * slowest one.
 *
 * app/(app)/film/[tmdbId]/page.tsx and .../show/[tmdbId]/page.tsx still
 * exist unchanged — this doesn't replace them, it's a faster path for
 * the one entry point (the library grid) where a full navigation was
 * the complaint. Search results still link to the real pages. Both this
 * panel and those pages render their body through FilmDetailBody /
 * ShowDetailBody, so the two surfaces can't drift the way they used to.
 */
export function DetailPanel({ item, onClose, onRemoved, onRematched }: DetailPanelProps) {
  // Keeps the last item's content visible while the close animation
  // plays — `item` itself goes null immediately on close.
  const [displayItem, setDisplayItem] = useState<LibraryItem | null>(null);
  useEffect(() => {
    if (item) setDisplayItem(item);
  }, [item]);

  const [detail, setDetail] = useState<FilmDetail | ShowDetail | null>(null);
  const [entries, setEntries] = useState<WatchEntry[] | ShowWatchEntry[] | null>(null);

  useEffect(() => {
    if (!item) return;
    setDetail(null);
    setEntries(null);

    const detailUrl =
      item.mediaType === "movie" ? `/api/tmdb/film/${item.id}` : `/api/tmdb/show/${item.id}`;
    const entriesUrl =
      item.mediaType === "movie"
        ? `/api/entries?filmId=${item.id}`
        : `/api/show-entries?showId=${item.id}`;

    fetch(detailUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then(setDetail)
      .catch(() => setDetail(null));

    fetch(entriesUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [item]);

  if (!displayItem) return null;

  const stats = {
    watchCount: displayItem.watchCount,
    rating: displayItem.rating,
    lastWatchedOn: displayItem.lastWatchedOn,
  };

  return (
    <SidePanel
      open={item !== null}
      onClose={onClose}
      ariaLabel={displayItem.title}
      pattern="pattern-aperture-echo"
    >
      {displayItem.mediaType === "movie" ? (
        <FilmDetailBody
          header={displayItem}
          stats={stats}
          detail={detail as FilmDetail | null}
          entries={entries as WatchEntry[] | null}
          onGenreNavigate={onClose}
          onRemoved={() => onRemoved(displayItem)}
          onRematched={onRematched}
        />
      ) : (
        <ShowDetailBody
          header={displayItem}
          stats={stats}
          detail={detail as ShowDetail | null}
          entries={entries as ShowWatchEntry[] | null}
          onGenreNavigate={onClose}
          onRemoved={() => onRemoved(displayItem)}
          onRematched={onRematched}
        />
      )}
    </SidePanel>
  );
}
