"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Check } from "lucide-react";
import { PosterThumb } from "@/components/film/PosterThumb";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { FilmSummary, ShowSummary } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

type SearchResult =
  | (FilmSummary & { mediaType: "movie" })
  | (ShowSummary & { mediaType: "show" });

const DEBOUNCE_MS = 250;

/**
 * Queries movies and shows in parallel (/api/tmdb/search and
 * /api/tmdb/search-shows) rather than TMDB's /search/multi — that would
 * need its own result-shape handling (movie/tv/person discriminator,
 * separate genre vocabularies) threaded through this whole pipeline, a
 * bigger change than reusing the two search endpoints the Add screen
 * already exercises. Tolerant of one side failing: only shows the error
 * state if both do, so a single flaky endpoint doesn't hide the other's
 * results.
 */
export function SearchPanel({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
        ...(movies.status === "fulfilled" ? movies.value.map((f) => ({ ...f, mediaType: "movie" as const })) : []),
        ...(shows.status === "fulfilled" ? shows.value.map((s) => ({ ...s, mediaType: "show" as const })) : []),
      ];
      // Stable sort — seen items first, otherwise each source's own
      // relevance order (and movies-before-shows within a seen group)
      // is preserved.
      merged.sort((a, b) => Number(b.seen) - Number(a.seen));

      setResults(merged);
      setStatus("success");
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative px-4 pt-4 pb-2 md:px-8 md:pt-8">
        <SearchIcon
          size={18}
          strokeWidth={2}
          className="text-label-3 pointer-events-none absolute top-1/2 left-8 -translate-y-1/2 md:left-12"
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search.placeholder}
          aria-label={copy.search.placeholder}
          className="text-body bg-surface-1 text-label placeholder:text-label-3 min-h-11 w-full rounded-md py-2 pr-4 pl-10 outline-none"
        />
      </div>

      <div className="flex-1 px-4 pb-8 md:px-8">
        {status === "idle" && (
          <p className="text-body text-label-2 mt-8 text-center">{copy.search.emptyPrompt}</p>
        )}

        {status === "error" && (
          <p className="text-body text-danger mt-8 text-center">{errorMessage}</p>
        )}

        {status === "success" && results.length === 0 && (
          <p className="text-body text-label-2 mt-8 text-center">
            {copy.search.noResults} &ldquo;{query}&rdquo;.
          </p>
        )}

        {(status === "success" || status === "loading") && results.length > 0 && (
          <ul className="flex flex-col gap-4">
            {results.map((item) => (
              <li key={`${item.mediaType}-${item.id}`}>
                <Link
                  href={item.mediaType === "movie" ? `/film/${item.id}` : `/show/${item.id}`}
                  onClick={onNavigate}
                  className="hover:bg-surface-1 flex items-center gap-3 rounded-md p-2"
                >
                  <PosterThumb
                    title={item.title}
                    year={item.year}
                    posterPath={item.posterPath}
                    size="w342"
                    sizes="56px"
                    className="w-14 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-label truncate">{item.title}</p>
                    <p className="text-footnote text-label-2">
                      {item.year ?? "—"}
                      {item.mediaType === "show" && ` · ${copy.library.filter.shows}`}
                    </p>
                  </div>
                  {item.seen && (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-good text-caption flex items-center gap-1 font-medium uppercase">
                        <Check size={14} strokeWidth={2.5} />
                        {copy.search.seenLabel}
                      </span>
                      <span className="text-caption text-label-2">
                        {formatWatchedDate({
                          watchedOn: item.lastWatchedOn,
                          precision: item.lastWatchedPrecision ?? "unknown",
                          eraLabel: item.lastWatchedEraLabel,
                        })}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
