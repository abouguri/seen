"use client";

import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/ui/Stars";
import { ShowViewingHistory } from "@/components/show/ShowViewingHistory";
import { SeasonChecklist } from "@/components/show/SeasonChecklist";
import { posterUrl, backdropUrl } from "@/lib/images";
import { copy } from "@/lib/copy";
import type { EpisodeWatchEntry, SeasonSummary, ShowDetail, ShowWatchEntry } from "@/lib/types";

type ShowDetailBodyProps = {
  header: { id: number; title: string; year: number | null; posterPath: string | null };
  stats: { watchCount: number; rating: number | null; lastWatchedOn: string | null };
  /** null only while the panel's own client fetch is in flight — the page
   *  always has this by render time. */
  detail: ShowDetail | null;
  /** Same nullability as `detail`. */
  entries: ShowWatchEntry[] | null;
  /** Only the page passes these — the panel doesn't fetch season/episode
   *  data (that's a new client fetch, not deduplication, so it's out of
   *  scope here), and the section is simply omitted when absent. */
  seasons?: SeasonSummary[];
  episodeEntries?: EpisodeWatchEntry[];
  headingLevel?: "h1" | "h2";
  onGenreNavigate?: () => void;
};

/** Show-side sibling of components/film/FilmDetailBody.tsx — same split,
 *  same guarantees, creators/status in place of directors/runtime. */
export function ShowDetailBody({
  header,
  stats,
  detail,
  entries,
  seasons,
  episodeEntries,
  headingLevel = "h2",
  onGenreNavigate,
}: ShowDetailBodyProps) {
  const poster = posterUrl(header.posterPath, "w500");
  const backdrop = detail ? backdropUrl(detail.backdropPath, "w1280") : null;

  const metaParts =
    detail === null
      ? null
      : [
          header.year ? String(header.year) : null,
          detail.creators.length ? detail.creators.join(", ") : null,
          detail.status,
        ].filter(Boolean);

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
          {metaParts === null ? (
            <div className="bg-surface-2 mt-2 h-4 w-3/4 animate-pulse rounded-xs" />
          ) : (
            metaParts.length > 0 && (
              <p className="text-subhead text-label-2 mt-1">{metaParts.join(" · ")}</p>
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

      <div className="mt-6 px-4 md:px-9">
        {entries === null ? (
          <div className="flex flex-col gap-2.5">
            <div className="bg-surface-2 h-7 w-40 animate-pulse rounded-xs" />
            <div className="bg-surface-2 h-20 animate-pulse rounded-sm" />
          </div>
        ) : (
          <ShowViewingHistory key={header.id} showId={header.id} initialEntries={entries} />
        )}

        {seasons !== undefined && episodeEntries !== undefined && (
          <SeasonChecklist showId={header.id} initialSeasons={seasons} initialEntries={episodeEntries} />
        )}

        {detail?.overview && (
          <div className="border-separator mt-9 border-t pt-5">
            <p className="text-eyebrow text-label-3 mb-2.5">{copy.film.synopsis}</p>
            <p className="text-subhead text-label-2 leading-relaxed">{detail.overview}</p>
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
