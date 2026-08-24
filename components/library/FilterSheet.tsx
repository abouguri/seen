"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import type { LibraryFilters } from "@/lib/types";
import type { LibraryFilterState } from "@/components/library/useLibraryData";

type FilterSheetProps = {
  open: boolean;
  value: LibraryFilterState;
  onChange: (filters: LibraryFilterState) => void;
  onClose: () => void;
};

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "text-footnote min-h-9 shrink-0 rounded-full px-3 py-1.5",
        active ? "bg-accent text-on-accent" : "bg-surface-2 text-label-2 hover:text-label",
      )}
    >
      {label}
    </button>
  );
}

export function FilterSheet({ open, value, onChange, onClose }: FilterSheetProps) {
  const [options, setOptions] = useState<LibraryFilters | null>(null);
  const [draft, setDraft] = useState<LibraryFilterState>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open || options) return;
    fetch("/api/library/filters")
      .then((res) => res.json())
      .then(setOptions)
      .catch(() => setOptions({ decades: [], genres: [], directors: [], tags: [] }));
  }, [open, options]);

  function apply() {
    onChange(draft);
    onClose();
  }

  function clear() {
    setDraft({});
    onChange({});
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={copy.library.filterLabel}>
      <div className="flex flex-col gap-6">
        <FilterRow label={copy.library.filter.decade}>
          <Pill
            label={copy.library.filter.allDecades}
            active={draft.decade === undefined}
            onClick={() => setDraft((d) => ({ ...d, decade: undefined }))}
          />
          {options?.decades.map((decade) => (
            <Pill
              key={decade}
              label={`${decade}s`}
              active={draft.decade === decade}
              onClick={() => setDraft((d) => ({ ...d, decade }))}
            />
          ))}
        </FilterRow>

        <FilterRow label={copy.library.filter.genre}>
          <Pill
            label={copy.library.filter.allGenres}
            active={draft.genre === undefined}
            onClick={() => setDraft((d) => ({ ...d, genre: undefined }))}
          />
          {options?.genres.map((genre) => (
            <Pill
              key={genre}
              label={genre}
              active={draft.genre === genre}
              onClick={() => setDraft((d) => ({ ...d, genre }))}
            />
          ))}
        </FilterRow>

        <FilterRow label={copy.library.filter.director}>
          <Pill
            label={copy.library.filter.allDirectors}
            active={draft.director === undefined}
            onClick={() => setDraft((d) => ({ ...d, director: undefined }))}
          />
          {options?.directors.map((director) => (
            <Pill
              key={director}
              label={director}
              active={draft.director === director}
              onClick={() => setDraft((d) => ({ ...d, director }))}
            />
          ))}
        </FilterRow>

        <FilterRow label={copy.library.filter.tag}>
          <Pill
            label={copy.library.filter.allTags}
            active={draft.tag === undefined}
            onClick={() => setDraft((d) => ({ ...d, tag: undefined }))}
          />
          {options?.tags.map((tag) => (
            <Pill
              key={tag}
              label={tag}
              active={draft.tag === tag}
              onClick={() => setDraft((d) => ({ ...d, tag }))}
            />
          ))}
        </FilterRow>

        <FilterRow label="">
          <Pill
            label={copy.library.filter.allRatings}
            active={draft.rated === undefined}
            onClick={() => setDraft((d) => ({ ...d, rated: undefined }))}
          />
          <Pill
            label={copy.library.filter.rated}
            active={draft.rated === "rated"}
            onClick={() => setDraft((d) => ({ ...d, rated: "rated" }))}
          />
          <Pill
            label={copy.library.filter.unrated}
            active={draft.rated === "unrated"}
            onClick={() => setDraft((d) => ({ ...d, rated: "unrated" }))}
          />
        </FilterRow>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={clear} className="flex-1">
            {copy.library.filter.clear}
          </Button>
          <Button onClick={apply} className="flex-1">
            {copy.library.filter.apply}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <p className="text-footnote text-label-2 mb-2">{label}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{children}</div>
    </div>
  );
}
