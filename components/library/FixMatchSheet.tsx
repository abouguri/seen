"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { posterUrl } from "@/lib/images";
import { copy } from "@/lib/copy";

type SearchResult = { id: number; title: string; year: number | null; posterPath: string | null };

type FixMatchSheetProps = {
  open: boolean;
  onClose: () => void;
  mediaType: "movie" | "show";
  currentId: number;
  title: string;
  /** Same optionality as RemoveFromLibraryButton: the page navigates to
   *  the corrected title's own URL; the panel closes and lets the grid
   *  refetch instead. */
  onRematched?: (newId: number) => void;
};

const DEBOUNCE_MS = 300;

/**
 * "Fix a bad TMDB match" (§ ROADMAP.md #3) — the only remedy today is
 * remove-and-re-add. Search results render as pickable poster cards
 * (modeled on components/import/ImportReview.tsx's candidate picker —
 * the closest existing precedent for "search results as a pick, not a
 * navigation"; components/search/SearchPanel.tsx's results are hardcoded
 * Links and can't be reused here), and confirming POSTs to the rematch
 * route, which moves this user's entries onto the picked id.
 */
export function FixMatchSheet({ open, onClose, mediaType, currentId, title, onRematched }: FixMatchSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setPickedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const endpoint = mediaType === "show" ? "/api/tmdb/search-shows" : "/api/tmdb/search";
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = res.ok ? await res.json() : [];
        setResults(data.filter((r) => r.id !== currentId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, mediaType, currentId]);

  const rematchMutation = useMutation({
    mutationFn: async (newId: number) => {
      const search = mediaType === "show" ? "?mediaType=show" : "";
      const res = await fetch(`/api/library/${currentId}/rematch${search}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newId }),
      });
      if (!res.ok) throw new Error(copy.errors.rematchFailed);
      return newId;
    },
    onSuccess: (newId) => {
      onClose();
      if (onRematched) onRematched(newId);
      else router.push(`/${mediaType === "movie" ? "film" : "show"}/${newId}`);
    },
    onError: () => showToast(copy.errors.rematchFailed),
  });

  return (
    <Sheet open={open} onClose={onClose} title={copy.library.fixMatch}>
      <div className="flex flex-col gap-4">
        <p className="text-footnote text-label-2">{copy.library.fixMatchContext(title)}</p>

        <input
          type="text"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.library.fixMatchSearchPlaceholder}
          className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-offset-2"
        />

        {query.trim() && !searching && results.length === 0 && (
          <p className="text-footnote text-label-2">{copy.library.fixMatchNoResults}</p>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {results.map((result) => {
              const url = posterUrl(result.posterPath, "w342");
              const isPicked = pickedId === result.id;
              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => setPickedId(result.id)}
                  className={clsx(
                    "overflow-hidden rounded-md outline-2 outline-offset-2",
                    isPicked ? "outline-accent" : "outline-transparent",
                  )}
                >
                  <div className="bg-surface-2 relative aspect-[2/3]">
                    {url && (
                      <Image
                        src={url}
                        alt={`${result.title} (${result.year ?? "unknown year"}) poster`}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="text-caption text-label-2 mt-1 truncate">
                    {result.title} {result.year ?? ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <Button
          onClick={() => pickedId && rematchMutation.mutate(pickedId)}
          disabled={pickedId === null || rematchMutation.isPending}
          className="w-full"
        >
          {copy.library.fixMatchConfirm}
        </Button>
      </div>
    </Sheet>
  );
}
