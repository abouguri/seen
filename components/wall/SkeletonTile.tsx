/** Same 2:3 box as a loaded poster so infinite scroll never reflows. */
export function SkeletonTile() {
  return <div className="bg-surface-2 aspect-[2/3] w-full animate-pulse rounded-md" />;
}
