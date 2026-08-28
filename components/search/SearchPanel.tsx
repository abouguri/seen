"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon } from "lucide-react";
import { clsx } from "clsx";
import { PosterThumb } from "@/components/film/PosterThumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { posterUrl } from "@/lib/images";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { FilmSummary, ShowSummary } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

type SearchResult =
  | (FilmSummary & { mediaType: "movie" })
  | (ShowSummary & { mediaType: "show" });

const DEBOUNCE_MS = 250;

function hrefFor(item: SearchResult) {
  return item.mediaType === "movie" ? `/film/${item.id}` : `/show/${item.id}`;
}

/**
 * Queries movies and shows in parallel (/api/tmdb/search and
 * /api/tmdb/search-shows) rather than TMDB's /search/multi — that would
 * need its own result-shape handling (movie/tv/person discriminator,
 * separate genre vocabularies) threaded through this whole pipeline, a
 * bigger change than reusing the two search endpoints the Add screen
 * already exercises. Tolerant of one side failing: only shows the error
 * state if both do, so a single flaky endpoint doesn't hide the other's
 * results.
 *
 * Results are split rather than ranked (SEEN Redesign): everything
 * you've already logged comes first as a row of posters, everything else
 * follows as a plain list. The question this screen answers is "have I
 * seen this?", and a single relevance-ordered list makes you read every
 * row's badge to find out. Two sections answer it before you read
 * anything.
 *
 * Two variants because one component serves two places: the full search
 * screen, where the query is set in display type, and the ⌘K palette,
 * where it can't be.
 */
export function SearchPanel({
  onNavigate,
  variant = "page",
}: {
  onNavigate?: () => void;
  variant?: "page" | "palette";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isPage = variant === "page";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      const q = encodeURIComponent(query);

      const [movies, shows] = await Promise.allSettled([
        fetch(`/api/tmdb/search?q=${q}`, { signal: controller.signal }).then(async (res) => {
          if (!res.ok) throw new Error();
          return (await res.json()) as FilmSummary[];
        }),
        fetch(`/api/tmdb/search-shows?q=${q}`, { signal: controller.signal }).then(async (res) => {
          if (!res.ok) throw new Error();
          return (await res.json()) as ShowSummary[];
        }),
      ]);

      if (controller.signal.aborted) return;

      if (movies.status === "rejected" && shows.status === "rejected") {
        setErrorMessage(copy.errors.tmdbUnreachable);
        setStatus("error");
        return;
      }

      const merged: SearchResult[] = [
        ...(movies.status === "fulfilled"
          ? movies.value.map((f) => ({ ...f, mediaType: "movie" as const }))
          : []),
        ...(shows.status === "fulfilled"
          ? shows.value.map((s) => ({ ...s, mediaType: "show" as const }))
          : []),
      ];

      setResults(merged);
      setStatus("success");
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Each source's own relevance order is preserved within a section —
  // the split is the only reordering.
  const seenResults = results.filter((item) => item.seen);
  const otherResults = results.filter((item) => !item.seen);

  return (
    <div className="flex flex-1 flex-col">
      <div
        className={clsx(
          "flex items-center gap-4",
          isPage ? "border-separator border-b px-4 pt-12 pb-5 md:px-9" : "px-4 py-3",
        )}
      >
        <SearchIcon
          size={isPage ? 24 : 18}
          strokeWidth={1.7}
          className="text-label-3 pointer-events-none shrink-0"
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search.placeholder}
          aria-label={copy.search.placeholder}
          className={clsx(
            "text-label placeholder:text-label-3 min-w-0 flex-1 bg-transparent outline-none",
            isPage
              ? "font-(family-name:--display) text-[clamp(2rem,1.2rem+3vw,3.5rem)] leading-none tracking-[-0.03em]"
              : "text-body min-h-11",
          )}
        />
      </div>

      <div className={clsx("flex-1", isPage ? "px-4 pb-10 md:px-9" : "px-4 pb-4")}>
        {status === "idle" &&
          (isPage ? (
            <EmptyState title={copy.search.emptyPromptTitle} body={copy.search.emptyPrompt} />
          ) : (
            <p className="text-body text-label-2 mt-8 text-center">{copy.search.emptyPrompt}</p>
          ))}

        {status === "error" &&
          (isPage ? (
            <EmptyState tone="error" title={errorMessage} />
          ) : (
            <p className="text-body text-danger mt-8 text-center">{errorMessage}</p>
          ))}

        {status === "success" &&
          results.length === 0 &&
          (isPage ? (
            <EmptyState
              title={copy.search.noResultsTitle}
              body={`${copy.search.noResults} \u201C${query}\u201D.`}
            />
          ) : (
            <p className="text-body text-label-2 mt-8 text-center">
              {copy.search.noResults} &ldquo;{query}&rdquo;.
            </p>
          ))}

        {seenResults.length > 0 && (
          <section>
            <h2 className="text-eyebrow text-label-3 pt-6 pb-4">{copy.search.inArchive}</h2>
            {isPage ? (
              // Posters, not rows: these are titles you already know, so
              // the cover is a faster match than the name.
              <ul className="no-scrollbar flex gap-3.5 overflow-x-auto pb-1">
                {seenResults.map((item) => (
                  <li key={`${item.mediaType}-${item.id}`} className="w-32 shrink-0 sm:w-37.5">
                    <Link
                      href={hrefFor(item)}
                      onClick={onNavigate}
                      className="focus-visible:outline-accent block rounded-sm outline-offset-2"
                    >
                      <SeenPoster item={item} />
                      <p className="text-footnote mt-2 truncate font-bold">{item.title}</p>
                      <p className="text-caption text-label-2 truncate">
                        {item.year ?? "—"}
                        {item.mediaType === "show" && ` · ${copy.library.filter.shows}`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-col gap-1">
                {seenResults.map((item) => (
                  <ResultRow key={`${item.mediaType}-${item.id}`} item={item} onNavigate={onNavigate} />
                ))}
              </ul>
            )}
          </section>
        )}

        {otherResults.length > 0 && (
          <section>
            <h2
              className={clsx(
                "text-eyebrow text-label-3 pb-3",
                seenResults.length > 0 && isPage ? "border-separator mt-8 border-t pt-6" : "pt-6",
              )}
            >
              {copy.search.elsewhere}
            </h2>
            <ul className="flex flex-col gap-1">
              {otherResults.map((item) => (
                <ResultRow key={`${item.mediaType}-${item.id}`} item={item} onNavigate={onNavigate} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** A poster with the "you've seen this" badge over it. */
function SeenPoster({ item }: { item: SearchResult }) {
  const url = posterUrl(item.posterPath, "w342");
  return (
    <div className="bg-surface-2 relative aspect-2/3 overflow-hidden rounded-sm shadow-[0_14px_30px_-10px_rgba(0,0,0,.45)]">
      {url ? (
        <Image src={url} alt="" fill sizes="150px" className="object-cover" />
      ) : (
        <div className="text-label-2 text-caption flex h-full w-full items-center justify-center p-2 text-center">
          {item.title}
        </div>
      )}
      <span className="bg-warm text-on-warm text-caption absolute top-2 left-2 rounded-full px-2 py-0.5 font-extrabold">
        {copy.search.seenLabel}
        {item.lastWatchedOn ? ` · ${item.lastWatchedOn.slice(0, 4)}` : ""}
      </span>
    </div>
  );
}

/** The list form — used for unseen results, and for everything in the
 *  ⌘K palette where there's no room for a poster row. */
function ResultRow({ item, onNavigate }: { item: SearchResult; onNavigate?: () => void }) {
  return (
    <li>
      <Link
        href={hrefFor(item)}
        onClick={onNavigate}
        className="hover:bg-surface-2 focus-visible:outline-accent group flex items-center gap-3.5 rounded-sm p-2 -outline-offset-2 transition-colors duration-(--t-hover)"
      >
        <PosterThumb
          title={item.title}
          year={item.year}
          posterPath={item.posterPath}
          size="w342"
          sizes="40px"
          className="w-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-subhead text-label truncate font-bold">{item.title}</p>
          <p className="text-footnote text-label-2 truncate">
            {item.year ?? "—"}
            {item.mediaType === "show" && ` · ${copy.library.filter.shows}`}
            {item.seen &&
              ` · ${copy.search.seenLabel} ${formatWatchedDate({
                watchedOn: item.lastWatchedOn,
                precision: item.lastWatchedPrecision ?? "unknown",
                eraLabel: item.lastWatchedEraLabel,
              })}`}
          </p>
        </div>
        {/* Not a button — the whole row navigates to the detail page,
            which is where a viewing actually gets logged. Styled as one
            because it names what happens next. */}
        <span className="text-caption border-separator-strong text-label-2 group-hover:text-label hidden shrink-0 rounded-xs border px-3 py-2 font-extrabold transition-colors duration-(--t-hover) sm:inline">
          {copy.search.logIt}
        </span>
      </Link>
    </li>
  );
}
