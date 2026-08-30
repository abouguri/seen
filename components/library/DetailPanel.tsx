"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SidePanel } from "@/components/ui/SidePanel";
import { Stars } from "@/components/ui/Stars";
import { ViewingHistory } from "@/components/film/ViewingHistory";
import { ShowViewingHistory } from "@/components/show/ShowViewingHistory";
import { posterUrl, backdropUrl } from "@/lib/images";
import { formatRuntime } from "@/lib/dates";
import { copy } from "@/lib/copy";
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
 * the complaint. Search results still link to the real pages.
 */
export function DetailPanel({ item, onClose }: DetailPanelProps) {
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

  const poster = posterUrl(displayItem.posterPath, "w500");
  const backdrop = detail !== null ? backdropUrl(detail.backdropPath, "w1280") : null;

  const metaParts =
    detail === null
      ? null
      : displayItem.mediaType === "movie"
        ? [
            displayItem.year ? String(displayItem.year) : null,
            (detail as FilmDetail).directors.length
              ? (detail as FilmDetail).directors.join(", ")
              : null,
            formatRuntime((detail as FilmDetail).runtime),
          ].filter(Boolean)
        : [
            displayItem.year ? String(displayItem.year) : null,
            (detail as ShowDetail).creators.length
              ? (detail as ShowDetail).creators.join(", ")
              : null,
            (detail as ShowDetail).status,
          ].filter(Boolean);

  return (
    <SidePanel
      open={item !== null}
      onClose={onClose}
      ariaLabel={displayItem.title}
      pattern="pattern-aperture-echo"
    >
      <div className="relative h-56 w-full overflow-hidden md:h-75">
        <div className="bg-surface-2 absolute inset-0 animate-pulse" />
        {backdrop && <Image src={backdrop} alt="" fill className="relative object-cover" />}
        {/* Fades the still into the panel's own surface rather than
            sitting on it as a photo with an edge. */}
        <div className="from-surface-1 via-surface-1/70 absolute inset-0 bg-linear-to-t to-transparent" />
      </div>

      <div className="relative -mt-17 flex items-end gap-4.5 px-6">
        <div className="bg-surface-2 relative aspect-2/3 w-29.5 shrink-0 overflow-hidden rounded-sm shadow-[0_18px_40px_-12px_rgba(0,0,0,.5)]">
          {poster ? (
            <Image
              src={poster}
              alt={`${displayItem.title} poster`}
              fill
              sizes="118px"
              className="object-cover"
            />
          ) : (
            <div className="text-label-2 text-caption flex h-full w-full items-center justify-center p-2 text-center">
              {displayItem.title}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-end pb-1">
          <h2 className="text-display-2">{displayItem.title}</h2>
          {metaParts === null ? (
            <div className="bg-surface-2 mt-2.5 h-4 w-3/4 animate-pulse rounded-xs" />
          ) : (
            metaParts.length > 0 && (
              <p className="text-footnote text-label-2 mt-2 font-bold">
                {metaParts.join(" · ")}
              </p>
            )
          )}
        </div>
      </div>

      {/* Three figures from data already in hand, so they never flash a
          skeleton: how many times, how you rated it, when you first
          logged it. */}
      <dl className="grid grid-cols-3 gap-3 px-6 pt-7">
        <StatCard label={copy.film.statSeen}>
          <span className="text-figure text-[1.875rem]">{displayItem.watchCount}×</span>
        </StatCard>
        <StatCard label={copy.film.statRating}>
          {displayItem.rating === null ? (
            <span className="text-figure text-label-3 text-[1.875rem]">—</span>
          ) : (
            <span className="mt-2 block">
              <Stars value={displayItem.rating} size={16} />
            </span>
          )}
        </StatCard>
        {/* The design's third figure is "first seen", but the earliest
            viewing only exists once the history request lands, and a
            figure that appears a beat after its two neighbours reads as
            a bug. Last seen comes straight off the grid item, so all
            three land together — and the first viewing is still right
            there at the foot of the timeline below. */}
        <StatCard label={copy.film.statLastSeen}>
          <span className="text-figure text-[1.875rem]">
            {displayItem.lastWatchedOn ? displayItem.lastWatchedOn.slice(0, 4) : "—"}
          </span>
        </StatCard>
      </dl>

      {/* Genre drives a top-level library filter but never appeared on
          the title itself, so after filtering to Drama there was no way
          to see that a title *is* Drama without leaving the panel.
          They're links rather than chips because ?genre= is exactly the
          param the library already parses — the panel's own filter, from
          the other direction. */}
      {detail !== null && detail.genres.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 pt-6">
          {detail.genres.map((genre) => (
            <Link
              key={genre}
              href={`/library?genre=${encodeURIComponent(genre)}`}
              onClick={onClose}
              className="text-footnote text-label-2 border-separator bg-surface-2 hover:border-separator-strong hover:text-label inline-flex min-h-8 items-center rounded-full border px-3 font-bold outline-offset-2 transition-colors duration-(--t-hover)"
            >
              {genre}
            </Link>
          ))}
        </div>
      )}

      <div className="px-6 pt-8 pb-8">
        {entries === null ? (
          <div className="flex flex-col gap-2.5">
            <div className="bg-surface-2 h-7 w-40 animate-pulse rounded-xs" />
            <div className="bg-surface-2 h-20 animate-pulse rounded-sm" />
          </div>
        ) : displayItem.mediaType === "movie" ? (
          <ViewingHistory
            key={displayItem.id}
            filmId={displayItem.id}
            initialEntries={entries as WatchEntry[]}
          />
        ) : (
          <ShowViewingHistory
            key={displayItem.id}
            showId={displayItem.id}
            initialEntries={entries as ShowWatchEntry[]}
          />
        )}

        {detail?.overview && (
          <div className="border-separator mt-9 border-t pt-5">
            <p className="text-eyebrow text-label-3 mb-2.5">{copy.film.synopsis}</p>
            <p className="text-subhead text-label-2 leading-relaxed">{detail.overview}</p>
          </div>
        )}
      </div>
    </SidePanel>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border-separator rounded-md border p-3.5">
      <dt className="text-[0.5625rem] text-label-3 font-extrabold tracking-[0.14em] uppercase">
        {label}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
