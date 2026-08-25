"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { copy } from "@/lib/copy";

export type FilterDropdownOption<T extends string | number> = {
  value: T;
  label: string;
  count?: number;
};

type FilterDropdownProps<T extends string | number> = {
  fieldLabel: string;
  /** Omit for a control with no "unset" state (e.g. Sort — there's
   *  always exactly one active choice, so no reset row is rendered). */
  allLabel?: string;
  options: FilterDropdownOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Netflix's Genres panel fits 21 options into 194px by going to three
// columns instead of one long scrolling list (measured on /browse/genre).
// Same rule here: a long Director/Tag list stays scannable in one glance
// instead of a 700px+ scroll.
function columnsFor(count: number): 1 | 2 | 3 {
  if (count > 16) return 3;
  if (count > 8) return 2;
  return 1;
}

/**
 * SEEN Interaction Plan §4 — instant-apply, anchored panel, single-select
 * (this app's filters are exclusive per field, not multi-select, so a
 * choice closes the panel immediately rather than staying open — the
 * plan's checkbox behaviour is for a true multi-select control). The
 * trigger carries its own state (§4.1's "single most important detail"):
 * once a value is picked the pill takes an accent border and shows the
 * pick, so a filtered library never reads as an empty one.
 */
export function FilterDropdown<T extends string | number>({
  fieldLabel,
  allLabel,
  options,
  value,
  onChange,
  open,
  onOpenChange,
}: FilterDropdownProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const active = selected !== undefined;
  const cols = columnsFor(options.length);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  function focusFirstOption() {
    // The panel is always mounted (visibility is CSS-only, see below), so
    // the option nodes already exist — no need to wait a frame for them
    // to appear. A deferred focus here previously raced Escape: opening
    // then immediately closing could land the async focus *after* Escape
    // had already moved focus back to the trigger, stealing it back.
    panelRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus();
  }

  function select(next: T | undefined) {
    onChange(next);
    onOpenChange(false);
    triggerRef.current?.focus();
  }

  function moveOption(from: HTMLElement, direction: 1 | -1) {
    const items = [...panelRef.current!.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
    const idx = items.indexOf(from as HTMLButtonElement);
    items[(idx + direction + items.length) % items.length]?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          onOpenChange(!open);
          if (!open) focusFirstOption();
        }}
        className={clsx(
          "text-subhead border-separator flex h-9.5 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-medium whitespace-nowrap",
          "transition-[background-color,border-color,color] duration-(--t-hover) ease-(--default-transition-timing-function)",
          open ? "bg-surface-2" : "hover:bg-surface-1",
          active ? "border-accent text-label" : "text-label-2",
        )}
      >
        {active ? `${fieldLabel}: ${selected.label}` : fieldLabel}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={clsx("text-label-2 transition-transform duration-(--t-panel)", open && "rotate-180")}
        />
      </button>

      {/* Kept mounted (not conditionally rendered) so open/close is a
          pure CSS transition — but a closed panel must still be pulled
          out of both the tab order (tabIndex=-1 on each option already
          does that) and the accessibility tree, or a screen reader
          announces all of a page's closed dropdowns as live content. */}
      <div
        ref={panelRef}
        role="menu"
        aria-label={`${copy.library.filterLabel}: ${fieldLabel}`}
        inert={!open}
        className={clsx(
          "bg-surface-1 border-separator absolute top-[calc(100%+8px)] left-0 z-20 origin-top-left rounded-md border p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,.8)]",
          "transition-[opacity,transform] duration-(--t-panel) ease-(--default-transition-timing-function)",
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-98 -translate-y-1.5 opacity-0",
          cols === 1 ? "max-h-72 min-w-55 overflow-y-auto" : "max-w-115",
        )}
      >
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))` }}>
          {allLabel && (
            <Option
              label={allLabel}
              count={undefined}
              checked={value === undefined}
              onSelect={() => select(undefined)}
              onArrow={moveOption}
            />
          )}
          {options.map((opt) => (
            <Option
              key={opt.value}
              label={opt.label}
              count={opt.count}
              checked={value === opt.value}
              onSelect={() => select(opt.value)}
              onArrow={moveOption}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Option({
  label,
  count,
  checked,
  onSelect,
  onArrow,
}: {
  label: string;
  count: number | undefined;
  checked: boolean;
  onSelect: () => void;
  onArrow: (from: HTMLElement, direction: 1 | -1) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onArrow(event.currentTarget, 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onArrow(event.currentTarget, -1);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="text-body hover:bg-surface-2 focus-visible:outline-accent flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left outline-offset-[-2px] transition-colors duration-(--t-hover)"
    >
      <Check size={15} strokeWidth={2.5} className={clsx("text-accent shrink-0", !checked && "invisible")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-caption text-label-2 font-mono shrink-0">{count}</span>
      )}
    </button>
  );
}
