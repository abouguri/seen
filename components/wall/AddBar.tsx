import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

/**
 * §6.2's floating confirmation — the only feedback for a wall tap, which
 * is why there are no per-tap toasts. Redrawn per the SEEN Redesign as a
 * centred pill rather than a full-width bar: it appears while you're
 * mid-sweep across the grid, and a bar pinned edge to edge reads as a
 * new permanent region of the page rather than a running tally.
 *
 * The count is set in the display face — it's the number you're watching
 * climb, and it's the one figure on the screen.
 *
 * Positioned above BottomTabs on mobile (its 56px plus the safe-area
 * inset) and off the bottom edge on desktop, where the nav is the left
 * rail and nothing is in the way.
 */
export function AddBar({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] md:pb-7">
      <div className="bg-surface-2 border-separator-strong pointer-events-auto flex items-center gap-4 rounded-lg border py-3 pr-3 pl-5.5 shadow-[0_24px_60px_-15px_rgba(0,0,0,.5)]">
        <span className="text-figure text-[1.625rem]">{count}</span>
        <span className="text-footnote text-label-2 font-bold">{copy.wall.addedLabel}</span>
        <Link href="/library" className={buttonClasses({ variant: "warm" })}>
          {copy.wall.done}
        </Link>
      </div>
    </div>
  );
}
