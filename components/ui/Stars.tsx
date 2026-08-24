import { Star } from "lucide-react";
import { clsx } from "clsx";

export type StarFill = "full" | "half" | "empty";

export function getStarFill(value: number, starIndex: number): StarFill {
  if (value >= starIndex * 2) return "full";
  if (value === starIndex * 2 - 1) return "half";
  return "empty";
}

export function StarIcon({ fill, size = 16 }: { fill: StarFill; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Star
        size={size}
        strokeWidth={1.5}
        className={clsx(fill === "empty" ? "text-label-3" : "text-accent")}
        fill={fill === "full" ? "currentColor" : "none"}
      />
      {fill === "half" && (
        <span className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: "50%" }}>
          <Star size={size} strokeWidth={1.5} className="text-accent" fill="currentColor" />
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
