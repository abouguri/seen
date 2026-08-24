"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryFilm, LibrarySort } from "@/lib/types";

export type LibraryFilterState = {
  decade?: number;
  genre?: string;
  director?: string;
  tag?: string;
  rated?: "rated" | "unrated";
};

function buildQuery(sort: LibrarySort, filters: LibraryFilterState, page: number): string {
  const params = new URLSearchParams({ sort, page: String(page) });
  if (filters.decade !== undefined) params.set("decade", String(filters.decade));
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.director) params.set("director", filters.director);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.rated) params.set("rated", filters.rated);
  return params.toString();
}

export function useLibraryData(sort: LibrarySort, filters: LibraryFilterState) {
  const [films, setFilms] = useState<LibraryFilm[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadingMoreRef = useRef(false);

  const filterKey = JSON.stringify(filters);

  const reload = useCallback(() => {
    setFilms([]);
    setPage(0);
    setError(false);
    setLoading(true);

    fetch(`/api/library?${buildQuery(sort, filters, 1)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { films: LibraryFilm[]; total: number };
      })
      .then((data) => {
        setFilms(data.films);
        setTotal(data.total);
        setPage(1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, filterKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || loading || films.length >= total) return;
    loadingMoreRef.current = true;
    const nextPage = page + 1;

    fetch(`/api/library?${buildQuery(sort, filters, nextPage)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { films: LibraryFilm[]; total: number };
      })
      .then((data) => {
        setFilms((prev) => [...prev, ...data.films]);
        setTotal(data.total);
        setPage(nextPage);
      })
      .catch(() => {
        // Silent — the grid still works with what's loaded; the user can
        // scroll away and back, or change filters, to retry naturally.
      })
      .finally(() => {
        loadingMoreRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, filterKey, page, films.length, total, loading]);

  const removeFilm = useCallback((filmId: number) => {
    setFilms((prev) => prev.filter((f) => f.id !== filmId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return { films, total, loading, error, loadMore, reload, removeFilm };
}
