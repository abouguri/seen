"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { StarRating } from "@/components/ui/StarRating";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import type { WatchPrecision } from "@/lib/types";

/** The subset of WatchEntry/ShowWatchEntry this form actually reads —
 *  both satisfy it structurally (tags is optional, so ShowWatchEntry,
 *  which has no tags field at all, still qualifies). */
type LoggableEntry = {
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  tags?: string[];
};

type WhenMode = "today" | "pickDate" | "year" | "roughly" | "unknown";

const WHEN_OPTIONS: { value: WhenMode; label: string }[] = [
  { value: "today", label: copy.logViewing.whenToday },
  { value: "pickDate", label: copy.logViewing.whenPickDate },
  { value: "year", label: copy.logViewing.whenYear },
  { value: "roughly", label: copy.logViewing.whenRoughly },
  { value: "unknown", label: copy.logViewing.whenUnknown },
];

export type LogViewingInput = {
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
  rating: number | null;
  note: string | null;
  place: string | null;
  company: string | null;
  tags: string[];
};

function localTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type FormState = {
  whenMode: WhenMode;
  dateValue: string;
  yearValue: string;
  eraValue: string;
  rating: number | null;
  note: string;
  place: string;
  company: string;
  tags: string[];
};

function initialStateFor(entry?: LoggableEntry): FormState {
  if (!entry) {
    return {
      whenMode: "today",
      dateValue: "",
      yearValue: String(new Date().getFullYear()),
      eraValue: "",
      rating: null,
      note: "",
      place: "",
      company: "",
      tags: [],
    };
  }

  const whenMode: WhenMode =
    entry.precision === "day"
      ? "pickDate"
      : entry.precision === "year"
        ? "year"
        : entry.precision === "era"
          ? "roughly"
          : "unknown";

  return {
    whenMode,
    dateValue: entry.precision === "day" ? (entry.watchedOn ?? "") : "",
    yearValue:
      entry.precision === "year" && entry.watchedOn
        ? entry.watchedOn.slice(0, 4)
        : String(new Date().getFullYear()),
    eraValue: entry.eraLabel ?? "",
    rating: entry.rating,
    note: entry.note ?? "",
    place: entry.place ?? "",
    company: entry.company ?? "",
    tags: entry.tags ?? [],
  };
}

type LogViewingSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LogViewingInput) => void;
  /** When set, the sheet edits this entry instead of creating a new one —
   *  pass a stable `key` (e.g. the entry id) from the parent so switching
   *  between entries or add/edit remounts with fresh initial state. */
  initialEntry?: LoggableEntry;
  /** Off for shows — tagging is film-only for now (§ TV support plan). */
  showTags?: boolean;
};

export function LogViewingSheet({
  open,
  onClose,
  onSubmit,
  initialEntry,
  showTags = true,
}: LogViewingSheetProps) {
  const [state, setState] = useState<FormState>(() => initialStateFor(initialEntry));
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const isEditing = Boolean(initialEntry);

  // Targets for the summary sentence's jump-to-field parts. The "when"
  // ref is shared across the three date inputs because only one of them
  // is ever mounted (they're mutually exclusive branches of whenMode).
  const whenFieldRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  function focusField(ref: React.RefObject<HTMLInputElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
    el.focus();
    el.select?.();
  }

  useEffect(() => {
    if (!open || !showTags) return;
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data: { tags: string[] }) => setTagSuggestions(data.tags))
      .catch(() => setTagSuggestions([]));
  }, [open, showTags]);

  const canSubmit = state.whenMode !== "pickDate" || state.dateValue.length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    let watchedOn: string | null = null;
    let precision: WatchPrecision = "unknown";
    let eraLabel: string | null = null;

    switch (state.whenMode) {
      case "today":
        watchedOn = localTodayIsoDate();
        precision = "day";
        break;
      case "pickDate":
        watchedOn = state.dateValue;
        precision = "day";
        break;
      case "year":
        watchedOn = `${state.yearValue}-01-01`;
        precision = "year";
        break;
      case "roughly":
        precision = "era";
        eraLabel = state.eraValue.trim() || null;
        break;
      case "unknown":
        precision = "unknown";
        break;
    }

    onSubmit({
      watchedOn,
      precision,
      eraLabel,
      rating: state.rating,
      note: state.note.trim() || null,
      place: state.place.trim() || null,
      company: state.company.trim() || null,
      tags: state.tags,
    });

    if (!isEditing) setState(initialStateFor());
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? copy.logViewing.editTitle : copy.logViewing.title}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* The redesign states the viewing back to you as a sentence
            rather than a stack of labelled fields. It's a live summary,
            not a second set of controls: each underlined part is a
            button that jumps to the field that sets it, so there's still
            exactly one place each value is entered. */}
        <p className="font-(family-name:--display) text-[clamp(1.5rem,1.1rem+1.6vw,2.125rem)] leading-relaxed tracking-[-0.02em]">
          {copy.logViewing.sentenceLead}{" "}
          <SentencePart onFocusField={() => focusField(whenFieldRef)}>
            {whenPhrase(state)}
          </SentencePart>
          {state.place && (
            <>
              , <SentencePart onFocusField={() => focusField(placeRef)}>{state.place}</SentencePart>
            </>
          )}
          {state.company && (
            <>
              , <SentencePart onFocusField={() => focusField(companyRef)}>{state.company}</SentencePart>
            </>
          )}
          .
        </p>

        <div>
          <p className="text-eyebrow text-label-3 mb-2.5">{copy.logViewing.whenLabel}</p>
          <Segmented
            options={WHEN_OPTIONS}
            value={state.whenMode}
            onChange={(value) => update("whenMode", value)}
            aria-label={copy.logViewing.whenLabel}
          />

          {state.whenMode === "pickDate" && (
            <input
              ref={whenFieldRef}
              type="date"
              value={state.dateValue}
              onChange={(event) => update("dateValue", event.target.value)}
              max={localTodayIsoDate()}
              aria-label={copy.logViewing.dateLabel}
              className="text-body bg-surface-2 text-label mt-3 min-h-11 w-full rounded-md px-3 outline-none"
            />
          )}

          {state.whenMode === "year" && (
            <input
              ref={whenFieldRef}
              type="number"
              inputMode="numeric"
              value={state.yearValue}
              onChange={(event) => update("yearValue", event.target.value)}
              min={1888}
              max={new Date().getFullYear()}
              aria-label={copy.logViewing.yearLabel}
              className="text-body bg-surface-2 text-label mt-3 min-h-11 w-32 rounded-md px-3 outline-none"
            />
          )}

          {state.whenMode === "roughly" && (
            <div className="mt-3">
              <input
                ref={whenFieldRef}
                type="text"
                value={state.eraValue}
                onChange={(event) => update("eraValue", event.target.value)}
                placeholder={copy.logViewing.eraPlaceholder}
                aria-label={copy.logViewing.eraLabel}
                className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {copy.logViewing.eraSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => update("eraValue", suggestion)}
                    className="text-footnote bg-surface-2 text-label-2 hover:text-label rounded-full px-3 py-1.5"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-separator flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5">
          <p className="text-eyebrow text-label-3 w-16">{copy.logViewing.ratingLabel}</p>
          <StarRating
            value={state.rating}
            onChange={(value) => update("rating", value)}
            aria-label={copy.logViewing.ratingLabel}
          />
          <span className="text-footnote text-label-2 font-bold">
            {state.rating === null ? copy.logViewing.unrated : `${state.rating} / 10`}
          </span>
        </div>

        <div>
          <label
            htmlFor="log-note"
            className="text-eyebrow text-label-3 mb-2.5 block"
          >
            {copy.logViewing.noteLabel}
          </label>
          {/* A textarea in the display face, not a single-line input:
              this is the field you're most likely to write a real
              sentence into, and the one thing on the screen worth
              re-reading later. */}
          <textarea
            id="log-note"
            rows={3}
            value={state.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder={copy.logViewing.notePlaceholder}
            className="bg-surface-2 border-separator text-label placeholder:text-label-3 focus-visible:outline-accent w-full resize-none rounded-md border p-4 font-(family-name:--display) text-xl leading-relaxed outline-offset-2"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="log-place" className="text-eyebrow text-label-3 mb-2.5 block">
              {copy.logViewing.placeLabel}
            </label>
            <input
              ref={placeRef}
              id="log-place"
              type="text"
              value={state.place}
              onChange={(event) => update("place", event.target.value)}
              placeholder={copy.logViewing.placePlaceholder}
              className="text-body bg-surface-2 border-separator text-label placeholder:text-label-3 focus-visible:outline-accent min-h-11 w-full rounded-md border px-3 outline-offset-2"
            />
          </div>
          <div>
            <label htmlFor="log-company" className="text-eyebrow text-label-3 mb-2.5 block">
              {copy.logViewing.companyLabel}
            </label>
            <input
              ref={companyRef}
              id="log-company"
              type="text"
              value={state.company}
              onChange={(event) => update("company", event.target.value)}
              placeholder={copy.logViewing.companyPlaceholder}
              className="text-body bg-surface-2 border-separator text-label placeholder:text-label-3 focus-visible:outline-accent min-h-11 w-full rounded-md border px-3 outline-offset-2"
            />
          </div>
        </div>

        {showTags && (
          <div>
            <p className="text-eyebrow text-label-3 mb-2.5">{copy.logViewing.tagsLabel}</p>
            <TagInput
              value={state.tags}
              onChange={(tags) => update("tags", tags)}
              suggestions={tagSuggestions}
            />
          </div>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {isEditing ? copy.logViewing.saveChanges : copy.logViewing.submit}
        </Button>
      </form>
    </Sheet>
  );
}

/** How the chosen "when" reads inside the summary sentence. */
function whenPhrase(state: FormState): string {
  switch (state.whenMode) {
    case "today":
      return copy.logViewing.phraseToday;
    case "pickDate":
      return state.dateValue
        ? new Date(`${state.dateValue}T00:00:00`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : copy.logViewing.phraseNoDate;
    case "year":
      return `${copy.logViewing.phraseInYear} ${state.yearValue}`;
    case "roughly":
      return state.eraValue.trim() || copy.logViewing.phraseRoughly;
    case "unknown":
      return copy.logViewing.phraseUnknown;
  }
}

/**
 * One underlined, pressable phrase in the summary sentence. It isn't a
 * control in its own right — pressing it moves focus to the field that
 * owns the value, so the sentence stays a mirror and never becomes a
 * second, competing place to enter the same thing.
 */
function SentencePart({
  children,
  onFocusField,
}: {
  children: React.ReactNode;
  onFocusField: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFocusField}
      className="decoration-warm focus-visible:outline-accent rounded-xs underline decoration-2 underline-offset-[6px] outline-offset-2"
    >
      {children}
    </button>
  );
}
