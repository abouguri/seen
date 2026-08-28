"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SortSheet } from "@/components/library/SortSheet";
import { FilterDropdown } from "@/components/library/FilterDropdown";
import { useMediaQuery } from "@/components/shared/useMediaQuery";
import { copy } from "@/lib/copy";
import type { LibrarySort } from "@/lib/types";

const SORT_VALUES: LibrarySort[] = ["recent_added", "recent_watched", "release_year", "rating", "title"];

type SortControlProps = {
  value: LibrarySort;
  onChange: (sort: LibrarySort) => void;
};

/**
 * Below ~640px this is a bottom sheet (same pattern as every other sheet
 * in the app — Log a viewing, Confirm, etc.); at wider widths it's the
 * same anchored dropdown the filter pills use. Sort was previously a
 * sheet at every width, including desktop, where a full-width bottom
 * sheet doesn't match the rest of the header row and was missing the
 * aria-haspopup/aria-expanded the dropdowns set automatically.
 */
export function SortControl({ value, onChange }: SortControlProps) {
  const isCompact = useMediaQuery("(max-width: 640px)");
  const [open, setOpen] = useState(false);

  if (isCompact) {
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
          {copy.library.sortLabel}
        </Button>
        <SortSheet open={open} value={value} onChange={onChange} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <FilterDropdown
      fieldLabel={copy.library.sortLabel}
      options={SORT_VALUES.map((v) => ({ value: v, label: copy.library.sort[v] }))}
      value={value}
      onChange={(v) => v !== undefined && onChange(v)}
      open={open}
      onOpenChange={setOpen}
      tone="plain"
    />
  );
}
