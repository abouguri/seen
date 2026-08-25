import Image from "next/image";
import { posterUrl, type PosterSize } from "@/lib/images";

type PosterThumbProps = {
  title: string;
  year: number | null;
  posterPath: string | null;
  size: PosterSize;
  sizes: string;
  className?: string;
};

/**
 * §9: missing poster falls back to a surface-2 tile with the title —
 * never a broken-image icon, never a generic film-reel placeholder.
 * Always 2:3 so nothing reflows between the two states.
 */
export function PosterThumb({ title, year, posterPath, size, sizes, className }: PosterThumbProps) {
  const url = posterUrl(posterPath, size);
  const alt = `${title} (${year ?? "unknown year"}) poster`;

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md ${className ?? ""}`}>
      {url ? (
        <>
          <div className="bg-surface-2 absolute inset-0 animate-pulse" />
          <Image src={url} alt={alt} fill sizes={sizes} className="object-cover" />
        </>
      ) : (
        <div className="bg-surface-2 text-label-2 text-subhead flex h-full w-full items-center justify-center p-2 text-center" role="img" aria-label={alt}>
          {title}
        </div>
      )}
    </div>
  );
}
