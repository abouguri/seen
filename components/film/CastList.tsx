import Image from "next/image";
import Link from "next/link";
import { profileUrl } from "@/lib/images";
import type { CastMember } from "@/lib/types";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A horizontal row of headshot + name, each linking to /people/[name] —
 * the cast section's replacement for the plain-text PersonLinks list.
 * Directors stay on PersonLinks (a name or two doesn't need photos the
 * way a ten-person cast row does).
 *
 * Missing profilePath (no photo in TMDB, or a legacy row from before cast
 * carried photos) falls back to an initials tile — same discipline as
 * PosterThumb's own fallback, sized identically to a real photo so
 * nothing reflows between the two states.
 */
export function CastList({ cast }: { cast: CastMember[] }) {
  return (
    <ul className="flex gap-4 overflow-x-auto pb-1">
      {cast.map((person, index) => {
        const url = profileUrl(person.profilePath, "w185");
        const href = `/people/${encodeURIComponent(person.name)}`;

        return (
          <li key={person.id ?? `${person.name}-${index}`} className="flex w-20 shrink-0 flex-col items-center gap-2">
            <Link href={href} className="rounded-full outline-offset-2">
              {url ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-full">
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                </div>
              ) : (
                <div
                  className="bg-surface-2 text-label-2 text-subhead flex h-16 w-16 items-center justify-center rounded-full"
                  role="img"
                  aria-label={person.name}
                >
                  {initials(person.name)}
                </div>
              )}
            </Link>
            <Link
              href={href}
              className="text-caption text-label-2 line-clamp-2 rounded-xs text-center outline-offset-2 hover:underline"
            >
              {person.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
