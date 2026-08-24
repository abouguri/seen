/**
 * TMDB image URL builder (§5). No auth required for the image CDN — this
 * file holds no secrets and is safe to import from client components.
 * The DB only ever stores the path fragment; URLs are built here.
 */
const IMAGE_BASE = "https://image.tmdb.org/t/p/";

export type PosterSize = "w342" | "w500";
export type BackdropSize = "w1280";

export function posterUrl(path: string | null, size: PosterSize): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}${size}${path}`;
}

export function backdropUrl(path: string | null, size: BackdropSize): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}${size}${path}`;
}
