import { Star } from "lucide-react";
import { clsx } from "clsx";

export type StarFill = "full" | "half" | "empty";

export function getStarFill(value: number, starIndex: number): StarFill {
  if (value >= starIndex * 2) return "full";
  if (value === starIndex * 2 - 1) return "half";
  return "empty";
}

/**
 * Ratings are the warm secondary, not the accent (SEEN Redesign). Two
 * reasons that's the right call and not just a colour swap: the accent
 * belongs to things you can press, and a rating isn't one — and the
 * accent violet is 2.45:1 on --surface-1, so a filled star drawn in it
 * all but disappears on the surfaces stars actually sit on (the detail
 * panel, the log sheet). The orange is 8.92:1 on the same surface.
 */
export function StarIcon({ fill, size = 16 }: { fill: StarFill; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Star
        size={size}
        strokeWidth={1.5}
        className={clsx(fill === "empty" ? "text-label-3" : "text-warm")}
        fill={fill === "full" ? "currentColor" : "none"}
      />
      {fill === "half" && (
        <span className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: "50%" }}>
          <Star size={size} strokeWidth={1.5} className="text-warm" fill="currentColor" />
        </span>
      )}
    </span>
  );
}

/** Pure five-star display for a 1–10 value. No interaction. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((starIndex) => (
        <StarIcon key={starIndex} fill={getStarFill(value, starIndex)} size={size} />
      ))}
    </div>
  );
}
