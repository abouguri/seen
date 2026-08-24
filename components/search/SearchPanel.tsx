"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Check } from "lucide-react";
import { PosterThumb } from "@/components/film/PosterThumb";
import { formatWatchedDate } from "@/lib/dates";
import { copy } from "@/lib/copy";
import type { FilmSummary } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

const DEBOUNCE_MS = 250;

export function SearchPanel({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FilmSummary[]>([]);
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
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setErrorMessage(body?.error?.message ?? copy.errors.tmdbUnreachable);
          setStatus("error");
          return;
        }
        const data = (await res.json()) as FilmSummary[];
        setResults(data);
        setStatus("success");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMessage(copy.errors.tmdbUnreachable);
        setStatus("error");
      }
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
          <ul className="flex flex-col gap-3">
            {results.map((film) => (
              <li key={film.id}>
                <Link
                  href={`/film/${film.id}`}
                  onClick={onNavigate}
                  className="hover:bg-surface-1 flex items-center gap-3 rounded-md p-2"
                >
                  <PosterThumb
                    title={film.title}
                    year={film.year}
                    posterPath={film.posterPath}
                    size="w342"
                    sizes="56px"
                    className="w-14 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-label truncate">{film.title}</p>
                    <p className="text-footnote text-label-2">{film.year ?? "—"}</p>
                  </div>
                  {film.seen && (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-good text-caption flex items-center gap-1 font-medium uppercase">
                        <Check size={14} strokeWidth={2.5} />
                        {copy.search.seenLabel}
                      </span>
                      <span className="text-caption text-label-2">
                        {formatWatchedDate({
                          watchedOn: film.lastWatchedOn,
                          precision: film.lastWatchedPrecision ?? "unknown",
                          eraLabel: film.lastWatchedEraLabel,
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
