"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/ui/Stars";
import { ViewingHistory } from "@/components/film/ViewingHistory";
import { RemoveFromLibraryButton } from "@/components/library/RemoveFromLibraryButton";
import { FixMatchSheet } from "@/components/library/FixMatchSheet";
import { PersonLinks } from "@/components/library/PersonLinks";
import { posterUrl, backdropUrl } from "@/lib/images";
import { formatRuntime } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { FilmDetail, WatchEntry } from "@/lib/types";

type FilmDetailBodyProps = {
  header: { id: number; title: string; year: number | null; posterPath: string | null };
  stats: { watchCount: number; rating: number | null; lastWatchedOn: string | null };
  /** null only while the panel's own client fetch is in flight — the page
   *  always has this by render time. */
  detail: FilmDetail | null;
  /** Same nullability as `detail`. */
  entries: WatchEntry[] | null;
  /** The page's real `<h1>` vs. the panel's supplementary `<h2>` inside a
   *  page that already has its own heading — a real semantic difference,
   *  not drift, so it's parameterized rather than picked one way. */
  headingLevel?: "h1" | "h2";
  /** Panel passes onClose (a genre chip doubles as "close and filter");
   *  the page passes nothing — the Link alone is the whole interaction. */
  onGenreNavigate?: () => void;
  /** Both default to the page's own behavior (navigate away) when
   *  omitted — see RemoveFromLibraryButton/FixMatchSheet. The panel
   *  overrides both to splice-and-close / close-and-reload instead. */
  onRemoved?: () => void;
  onRematched?: (newId: number) => void;
};

/**
 * The shared body for both the library grid's slide-over
 * (components/library/DetailPanel.tsx) and the shareable film page
 * (app/(app)/film/[tmdbId]/page.tsx) — split the way LeadCard was split
 * from LeadRecommendation: this is pure presentation, every nullable prop
 * is guarded, and it has no opinion about where its data came from. The
 * panel's `detail`/`entries` start null and stream in from a client
 * fetch; the page's are always resolved before this ever renders.
 */
export function FilmDetailBody({
  header,
  stats,
  detail,
  entries,
  headingLevel = "h2",
  onGenreNavigate,
  onRemoved,
  onRematched,
}: FilmDetailBodyProps) {
  const [fixMatchOpen, setFixMatchOpen] = useState(false);
  const poster = posterUrl(header.posterPath, "w500");
  const backdrop = detail ? backdropUrl(detail.backdropPath, "w1280") : null;

  const metaNodes: React.ReactNode[] | null =
    detail === null
      ? null
      : [
          header.year ? String(header.year) : null,
          detail.directors.length ? <PersonLinks names={detail.directors} /> : null,
          formatRuntime(detail.runtime),
        ].filter((node) => node !== null);

  const Heading = headingLevel;

  return (
    <div>
      <div className="relative h-[32vh] min-h-[200px] w-full overflow-hidden">
        <div className="bg-surface-2 absolute inset-0 animate-pulse" />
        {backdrop && <Image src={backdrop} alt="" fill className="relative object-cover" />}
        <div className="from-bg via-bg/70 absolute inset-0 bg-gradient-to-t to-transparent" />
      </div>

      <div className="relative -mt-16 flex gap-4 px-4 md:px-9">
        <div
          className="bg-surface-2 relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md md:w-36"
          style={{ viewTransitionName: "shared-poster" } as React.CSSProperties}
        >
          {poster ? (
            <Image
              src={poster}
              alt={`${header.title} (${header.year ?? "unknown year"}) poster`}
              width={342}
              height={513}
              className="relative h-full w-full object-cover"
            />
          ) : (
            <div className="text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center">
              {header.title}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-end pb-2">
          <Heading className="text-display-2">{header.title}</Heading>
          {metaNodes === null ? (
            <div className="bg-surface-2 mt-2 h-4 w-3/4 animate-pulse rounded-xs" />
          ) : (
            metaNodes.length > 0 && (
              <p className="text-subhead text-label-2 mt-1">
                {metaNodes.map((node, index) => (
                  <Fragment key={index}>
                    {index > 0 && " · "}
                    {node}
                  </Fragment>
                ))}
              </p>
            )
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 px-4 pt-7 md:px-9">
        <StatCard label={copy.film.statSeen}>
          <span className="text-figure text-[1.875rem]">{stats.watchCount}×</span>
        </StatCard>
        <StatCard label={copy.film.statRating}>
          {stats.rating === null ? (
            <span className="text-figure text-label-3 text-[1.875rem]">—</span>
          ) : (
            <span className="mt-2 block">
              <Stars value={stats.rating} size={16} />
            </span>
          )}
        </StatCard>
        <StatCard label={copy.film.statLastSeen}>
          <span className="text-figure text-[1.875rem]">
            {stats.lastWatchedOn ? stats.lastWatchedOn.slice(0, 4) : "—"}
          </span>
        </StatCard>
      </dl>

      {detail !== null && detail.genres.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-6 md:px-9">
          {detail.genres.map((genre) => (
            <Link
              key={genre}
              href={`/library?genre=${encodeURIComponent(genre)}`}
              onClick={onGenreNavigate}
              className="text-footnote text-label-2 border-separator bg-surface-2 hover:border-separator-strong hover:text-label inline-flex min-h-8 items-center rounded-full border px-3 font-bold outline-offset-2 transition-colors duration-(--t-hover)"
            >
              {genre}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 px-4 md:px-9">
        <button
          type="button"
          onClick={() => setFixMatchOpen(true)}
          className="text-footnote text-label-2 hover:text-label font-bold outline-offset-2"
        >
          {copy.library.fixMatch}
        </button>
        <RemoveFromLibraryButton
          mediaType="movie"
          id={header.id}
          title={header.title}
          watchCount={stats.watchCount}
          onRemoved={onRemoved}
        />
      </div>

      <FixMatchSheet
        open={fixMatchOpen}
        onClose={() => setFixMatchOpen(false)}
        mediaType="movie"
        currentId={header.id}
        title={header.title}
        onRematched={onRematched}
      />

      <div className="mt-4 px-4 md:px-9">
        {entries === null ? (
          <div className="flex flex-col gap-2.5">
            <div className="bg-surface-2 h-7 w-40 animate-pulse rounded-xs" />
            <div className="bg-surface-2 h-20 animate-pulse rounded-sm" />
          </div>
        ) : (
          <ViewingHistory key={header.id} filmId={header.id} initialEntries={entries} />
        )}

        {detail?.overview && (
          <div className="border-separator mt-9 border-t pt-5">
            <p className="text-eyebrow text-label-3 mb-2.5">{copy.film.synopsis}</p>
            <p className="text-subhead text-label-2 leading-relaxed">{detail.overview}</p>
          </div>
        )}

        {detail !== null && detail.castMembers.length > 0 && (
          <div className="mt-9">
            <p className="text-eyebrow text-label-3 mb-2.5">{copy.film.cast}</p>
            <p className="text-subhead text-label-2 leading-relaxed">
              <PersonLinks names={detail.castMembers} />
            </p>
          </div>
        )}
      </div>
    </div>
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
