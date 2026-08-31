import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { copy } from "@/lib/copy";

type YearNavProps = {
  year: number;
  /** "/stats" for the private page, "/u/{userId}/stats" for the public
   *  one — both mount this the same way, just a different base. */
  basePath: string;
};

/**
 * Prev/next year + back-to-all-time, for a year-in-review page
 * (§ ROADMAP.md #7). Visually mirrors components/wall/YearScroller.tsx's
 * chevrons, but plain <Link>s rather than client `onChange` state — this
 * is page navigation, not in-place filtering, a genuinely different
 * interaction, so it isn't a reuse of that component.
 */
export function YearNav({ year, basePath }: YearNavProps) {
  const currentYear = new Date().getFullYear();
  const nextDisabled = year >= currentYear;

  return (
    <div className="mb-6 flex items-center gap-1">
      <Link
        href={`${basePath}/${year - 1}`}
        aria-label="Previous year"
        className="text-label-2 hover:text-label flex h-9 w-9 items-center justify-center rounded-full outline-offset-2"
      >
        <ChevronLeft size={18} />
      </Link>

      {nextDisabled ? (
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center opacity-30">
          <ChevronRight size={18} />
        </span>
      ) : (
        <Link
          href={`${basePath}/${year + 1}`}
          aria-label="Next year"
          className="text-label-2 hover:text-label flex h-9 w-9 items-center justify-center rounded-full outline-offset-2"
        >
          <ChevronRight size={18} />
        </Link>
      )}

      <Link
        href={basePath}
        className="text-footnote text-label-2 hover:text-label ml-2 font-bold outline-offset-2"
      >
        {copy.stats.allTime}
      </Link>
    </div>
  );
}
