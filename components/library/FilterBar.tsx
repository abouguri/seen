"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FilterDropdown } from "@/components/library/FilterDropdown";
import { copy } from "@/lib/copy";
import type { LibraryFilters } from "@/lib/types";
import type { LibraryFilterState } from "@/components/library/useLibraryData";

type FilterBarProps = {
  value: LibraryFilterState;
  onChange: (filters: LibraryFilterState) => void;
};

const EMPTY: LibraryFilters = {
  decades: [],
  genres: [],
  directors: [],
  tags: [],
  rated: { rated: 0, unrated: 0 },
};

/**
 * SEEN Interaction Plan §4, adapted for this app's single-select-per-
 * field filter model: one anchored dropdown per field instead of one
 * "Filter" button opening a sheet with all five fields at once. Each
 * dropdown carries its own active state directly in its label (§4.1) —
 * with only one value possible per field, that already says what's
 * picked, so a separate removable-chips row would just repeat it.
 */
export function FilterBar({ value, onChange }: FilterBarProps) {
  const [options, setOptions] = useState<LibraryFilters>(EMPTY);
  const [openField, setOpenField] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/library/filters")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setOptions)
      .catch(() => setOptions(EMPTY));
  }, []);

  const hasActive = Object.values(value).some((v) => v !== undefined);

  function openChange(field: string) {
    return (open: boolean) => setOpenField(open ? field : null);
  }

  return (
    // A scroll container clips everything inside it, including an
    // absolutely-positioned dropdown panel anchored to one of its
    // children — and per the CSS Overflow spec, setting only overflow-x
    // forces the other axis to `auto` too (you can't have one axis
    // clipping and the other visible), so `overflow-x-auto` alone turns
    // this 38px-tall row into a 38px-tall clipping box for every panel
    // inside it. Scoped to narrow screens, where it's actually needed —
    // at desktop widths this row doesn't overflow in the first place.
    <div className="no-scrollbar flex items-center gap-2 max-sm:overflow-x-auto sm:flex-wrap">
      <FilterDropdown
        fieldLabel={copy.library.filter.typeFieldLabel}
        allLabel={copy.library.filter.allTypes}
        options={[
          { value: "movie" as const, label: copy.library.filter.movies },
          { value: "show" as const, label: copy.library.filter.shows },
        ]}
        value={value.mediaType === "movie" || value.mediaType === "show" ? value.mediaType : undefined}
        onChange={(v) => onChange({ ...value, mediaType: v })}
        open={openField === "mediaType"}
        onOpenChange={openChange("mediaType")}
      />
      <FilterDropdown
        fieldLabel={copy.library.filter.decade}
        allLabel={copy.library.filter.allDecades}
        options={options.decades.map((o) => ({ value: o.value, label: `${o.value}s`, count: o.count }))}
        value={value.decade}
        onChange={(v) => onChange({ ...value, decade: v })}
        open={openField === "decade"}
        onOpenChange={openChange("decade")}
      />
      <FilterDropdown
        fieldLabel={copy.library.filter.genre}
        allLabel={copy.library.filter.allGenres}
        options={options.genres.map((o) => ({ value: o.value, label: o.value, count: o.count }))}
        value={value.genre}
        onChange={(v) => onChange({ ...value, genre: v })}
        open={openField === "genre"}
        onOpenChange={openChange("genre")}
      />
      <FilterDropdown
        fieldLabel={copy.library.filter.director}
        allLabel={copy.library.filter.allDirectors}
        options={options.directors.map((o) => ({ value: o.value, label: o.value, count: o.count }))}
        value={value.director}
        onChange={(v) => onChange({ ...value, director: v })}
        open={openField === "director"}
        onOpenChange={openChange("director")}
      />
      <FilterDropdown
        fieldLabel={copy.library.filter.ratingFieldLabel}
        allLabel={copy.library.filter.allRatings}
        options={[
          { value: "rated" as const, label: copy.library.filter.rated, count: options.rated.rated },
          { value: "unrated" as const, label: copy.library.filter.unrated, count: options.rated.unrated },
        ]}
        value={value.rated}
        onChange={(v) => onChange({ ...value, rated: v })}
        open={openField === "rated"}
        onOpenChange={openChange("rated")}
      />
      <FilterDropdown
        fieldLabel={copy.library.filter.tag}
        allLabel={copy.library.filter.allTags}
        options={options.tags.map((o) => ({ value: o.value, label: o.value, count: o.count }))}
        value={value.tag}
        onChange={(v) => onChange({ ...value, tag: v })}
        open={openField === "tag"}
        onOpenChange={openChange("tag")}
      />

      {hasActive && (
        <Button variant="ghost" onClick={() => onChange({})} className="text-footnote h-9.5 shrink-0 px-3">
          {copy.library.filter.clear}
        </Button>
      )}
    </div>
  );
}
