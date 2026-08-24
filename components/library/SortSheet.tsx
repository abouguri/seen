"use client";

import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { copy } from "@/lib/copy";
import type { LibrarySort } from "@/lib/types";

const SORT_OPTIONS: LibrarySort[] = [
  "recent_added",
  "recent_watched",
  "release_year",
  "rating",
  "title",
];

type SortSheetProps = {
  open: boolean;
  value: LibrarySort;
  onChange: (sort: LibrarySort) => void;
  onClose: () => void;
};

export function SortSheet({ open, value, onChange, onClose }: SortSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={copy.library.sortLabel}>
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
              {copy.library.sort[option]}
              {value === option && <Check size={18} className="text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
