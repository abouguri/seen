"use client";

import { getStarFill, StarIcon } from "@/components/ui/Stars";

type StarRatingProps = {
  /** 1–10, half-star granularity (2 points per star). Null = unrated. */
  value: number | null;
  onChange: (value: number | null) => void;
  "aria-label": string;
};

/** Five stars with half-steps, stored 1–10 (§6.7). Never pre-filled. */
export function StarRating({ value, onChange, "aria-label": ariaLabel }: StarRatingProps) {
  const current = value ?? 0;

  function pickFromPointer(starIndex: number, clientX: number, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const isLeftHalf = clientX - rect.left < rect.width / 2;
    onChange(starIndex * 2 - (isLeftHalf ? 1 : 0));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(10, current + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = current - 1;
      onChange(next <= 0 ? null : next);
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(null);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(10);
    }
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={current}
      aria-valuetext={value ? `${value} of 10` : "Unrated"}
      onKeyDown={handleKeyDown}
      className="focus-visible:outline-accent inline-flex rounded-sm outline-offset-4"
    >
      {[1, 2, 3, 4, 5].map((starIndex) => (
        <button
          key={starIndex}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={(event) => pickFromPointer(starIndex, event.clientX, event.currentTarget)}
          className="flex h-11 w-11 items-center justify-center"
        >
          <StarIcon fill={getStarFill(current, starIndex)} size={24} />
        </button>
      ))}
    </div>
  );
}
