"use client";

import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { copy } from "@/lib/copy";
import type { PersonFilmographySort } from "@/lib/types";

const SORT_OPTIONS: PersonFilmographySort[] = ["newest", "oldest", "title"];

type PersonSortSheetProps = {
  open: boolean;
  value: PersonFilmographySort;
  onChange: (sort: PersonFilmographySort) => void;
  onClose: () => void;
};

/** components/library/SortSheet.tsx, typed to the person page's own
 *  small sort set instead of LibrarySort. */
export function PersonSortSheet({ open, value, onChange, onClose }: PersonSortSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={copy.people.sortLabel}>
      <ul className="flex flex-col">
        {SORT_OPTIONS.map((option) => (
          <li key={option}>
            <button
              type="button"
              onClick={() => {
                onChange(option);
                onClose();
              }}
              className="text-body flex min-h-11 w-full items-center justify-between py-2"
            >
              {copy.people.sort[option]}
              {value === option && <Check size={18} className="text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
