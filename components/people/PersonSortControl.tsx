"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PersonSortSheet } from "@/components/people/PersonSortSheet";
import { FilterDropdown } from "@/components/library/FilterDropdown";
import { useMediaQuery } from "@/components/shared/useMediaQuery";
import { copy } from "@/lib/copy";
import type { PersonFilmographySort } from "@/lib/types";

const SORT_VALUES: PersonFilmographySort[] = ["newest", "oldest", "title"];

type PersonSortControlProps = {
  value: PersonFilmographySort;
  onChange: (sort: PersonFilmographySort) => void;
};

/** components/library/SortControl.tsx's exact responsive split (sheet
 *  below ~640px, anchored dropdown above it), reused rather than
 *  reinvented — FilterDropdown is already generic, so only the sheet
 *  half needed a person-specific sibling. */
export function PersonSortControl({ value, onChange }: PersonSortControlProps) {
  const isCompact = useMediaQuery("(max-width: 640px)");
  const [open, setOpen] = useState(false);

  if (isCompact) {
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
          {copy.people.sortLabel}
        </Button>
        <PersonSortSheet open={open} value={value} onChange={onChange} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <FilterDropdown
      fieldLabel={copy.people.sortLabel}
      options={SORT_VALUES.map((v) => ({ value: v, label: copy.people.sort[v] }))}
      value={value}
      onChange={(v) => v !== undefined && onChange(v)}
      open={open}
      onOpenChange={setOpen}
      tone="plain"
    />
  );
}
