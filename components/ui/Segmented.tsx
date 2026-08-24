"use client";

import { clsx } from "clsx";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="bg-surface-1 flex flex-wrap gap-1 rounded-md p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              "text-footnote min-h-9 rounded-sm px-3 py-1.5 transition-colors",
              active ? "bg-accent text-on-accent" : "text-label-2 hover:text-label",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
