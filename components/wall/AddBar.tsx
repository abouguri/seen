import Link from "next/link";
import { copy } from "@/lib/copy";

/** §6.2 wireframe: floating material bar, the only confirmation — no toasts for successful taps. */
export function AddBar({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="material-chrome border-separator fixed inset-x-0 bottom-16 z-10 flex items-center justify-between border-t px-4 py-3 md:bottom-0 md:left-60">
      <span className="text-headline">{copy.wall.addedCount(count)}</span>
      <Link href="/library" className="text-headline text-accent">
        {copy.wall.done}
      </Link>
    </div>
  );
}
