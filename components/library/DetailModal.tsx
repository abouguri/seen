"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { ViewingHistory } from "@/components/film/ViewingHistory";
import { ShowViewingHistory } from "@/components/show/ShowViewingHistory";
import { posterUrl, backdropUrl } from "@/lib/images";
import { formatRuntime } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { LibraryItem, FilmDetail, ShowDetail, WatchEntry, ShowWatchEntry } from "@/lib/types";

type DetailModalProps = {
  item: LibraryItem | null;
  onClose: () => void;
};

/**
 * The library grid's "click a poster" flow, as an overlay instead of a
 * full page navigation — poster/title/year are already known (they're
 * right there in the grid item, LibraryItem), so those render the
 * instant the modal opens with zero fetch. Only the backdrop, synopsis,
 * meta line (director/runtime or creators/status), and viewing history
 * need a request, and each streams in independently as soon as its own
 * fetch resolves rather than gating the whole modal on the slowest one.
 *
 * app/(app)/film/[tmdbId]/page.tsx and .../show/[tmdbId]/page.tsx still
 * exist unchanged — this doesn't replace them, it's a faster path for
 * the one entry point (the library grid) where a full navigation was
 * the complaint. Search results still link to the real pages.
 */
export function DetailModal({ item, onClose }: DetailModalProps) {
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

    const detailUrl = item.mediaType === "movie" ? `/api/tmdb/film/${item.id}` : `/api/tmdb/show/${item.id}`;
    const entriesUrl =
      item.mediaType === "movie" ? `/api/entries?filmId=${item.id}` : `/api/show-entries?showId=${item.id}`;

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

  const poster = posterUrl(displayItem.posterPath, "w500");
  const backdrop = detail !== null ? backdropUrl(detail.backdropPath, "w1280") : null;

  const metaParts =
    detail === null
      ? null
      : displayItem.mediaType === "movie"
        ? [
            displayItem.year ? String(displayItem.year) : null,
            (detail as FilmDetail).directors.length ? (detail as FilmDetail).directors.join(", ") : null,
            formatRuntime((detail as FilmDetail).runtime),
          ].filter(Boolean)
        : [
            displayItem.year ? String(displayItem.year) : null,
            (detail as ShowDetail).creators.length ? (detail as ShowDetail).creators.join(", ") : null,
            (detail as ShowDetail).status,
          ].filter(Boolean);

  return (
    <Modal open={item !== null} onClose={onClose} ariaLabel={displayItem.title}>
      <div className="relative h-40 w-full overflow-hidden md:h-56">
        <div className="bg-surface-2 absolute inset-0 animate-pulse" />
        {backdrop && <Image src={backdrop} alt="" fill className="relative object-cover" />}
        <div className="from-surface-1 via-surface-1/70 absolute inset-0 bg-linear-to-t to-transparent" />
      </div>

      <div className="relative -mt-14 flex gap-4 px-5">
        <div className="bg-surface-2 relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-md">
          {poster ? (
            <Image src={poster} alt={`${displayItem.title} poster`} fill className="object-cover" />
          ) : (
            <div className="text-label-2 text-caption flex h-full w-full items-center justify-center p-2 text-center">
              {displayItem.title}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-end pb-2">
          <h2 className="text-title-2">{displayItem.title}</h2>
          {metaParts === null ? (
            <div className="bg-surface-2 mt-2 h-4 w-3/4 animate-pulse rounded" />
          ) : (
            metaParts.length > 0 && <p className="text-subhead text-label-2 mt-1">{metaParts.join(" · ")}</p>
          )}
        </div>
      </div>

      <div className="px-5 pt-6 pb-6">
        {entries === null ? (
          <div className="flex flex-col gap-2">
            <div className="bg-surface-2 h-6 w-40 animate-pulse rounded" />
            <div className="bg-surface-2 h-16 animate-pulse rounded" />
          </div>
        ) : displayItem.mediaType === "movie" ? (
          <ViewingHistory key={displayItem.id} filmId={displayItem.id} initialEntries={entries as WatchEntry[]} />
        ) : (
          <ShowViewingHistory key={displayItem.id} showId={displayItem.id} initialEntries={entries as ShowWatchEntry[]} />
        )}

        {detail?.overview && (
          <details className="border-separator mt-8 border-t pt-4">
            <summary className="text-headline cursor-pointer">{copy.film.synopsis}</summary>
            <p className="text-body text-label-2 mt-3">{detail.overview}</p>
          </details>
        )}
      </div>
    </Modal>
  );
}
