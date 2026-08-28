"use client";

import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

/**
 * The library's opening statement, per the SEEN Redesign: the count as a
 * small uppercase eyebrow, then a two-line serif headline with the
 * second line in the accent tint, and the two things you'd want from
 * here — find something, add something — parked on the right.
 *
 * It replaces the collapsing 34pt-to-17pt title (§7.2). That pattern
 * exists to keep a screen's name on screen while you scroll; this
 * headline isn't a name, it's a greeting, and pinning a shrunken copy of
 * it to the top would compete with the filter chips directly beneath.
 * Navigation already says where you are — the rail marks Library.
 *
 * The search control is a link styled as a field rather than a real
 * input: it hands off to the search screen (and the same ⌘K palette
 * CommandK binds), so making it type-able here would fork the query
 * between two places.
 */
export function LibraryHero({ count, countNoun }: { count: number; countNoun: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 px-4 pt-8 md:px-9">
      <div>
        <p className="text-eyebrow text-label-2">
          {count} {countNoun}
        </p>
        <h1 className="text-display-1 mt-2.5">
          {copy.library.headlineLead}
          <br />
          <span className="text-accent-text">{copy.library.headlineAccent}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2.5 pb-1.5">
        <Link
          href="/search"
          className="text-footnote text-label-3 border-separator bg-surface-1 hover:text-label-2 focus-visible:outline-accent flex h-11.5 min-w-0 items-center gap-2.5 rounded-md border px-3.5 font-semibold outline-offset-2 transition-colors duration-(--t-hover) ease-(--default-transition-timing-function) sm:min-w-70"
        >
          <SearchIcon size={16} strokeWidth={1.8} className="shrink-0" />
          <span className="flex-1 truncate">{copy.library.searchAffordance}</span>
          <kbd className="border-separator-strong text-[0.625rem] hidden shrink-0 rounded-xs border px-1.5 py-0.5 font-sans sm:inline">
            ⌘K
          </kbd>
        </Link>

        <Link href="/add" className={buttonClasses()}>
          {copy.library.addAction}
        </Link>
      </div>
    </div>
  );
}
