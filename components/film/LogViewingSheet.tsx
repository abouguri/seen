"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import type { WatchEntry, WatchPrecision } from "@/lib/types";

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
};

function initialStateFor(entry?: WatchEntry): FormState {
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
  };
}

type LogViewingSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LogViewingInput) => void;
  /** When set, the sheet edits this entry instead of creating a new one —
   *  pass a stable `key` (e.g. the entry id) from the parent so switching
   *  between entries or add/edit remounts with fresh initial state. */
  initialEntry?: WatchEntry;
};

export function LogViewingSheet({ open, onClose, onSubmit, initialEntry }: LogViewingSheetProps) {
  const [state, setState] = useState<FormState>(() => initialStateFor(initialEntry));
  const isEditing = Boolean(initialEntry);

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
        <div>
          <p className="text-footnote text-label-2 mb-2">{copy.logViewing.whenLabel}</p>
          <Segmented
            options={WHEN_OPTIONS}
            value={state.whenMode}
            onChange={(value) => update("whenMode", value)}
            aria-label={copy.logViewing.whenLabel}
          />

          {state.whenMode === "pickDate" && (
            <input
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

        <div>
          <p className="text-footnote text-label-2 mb-2">{copy.logViewing.ratingLabel}</p>
          <StarRating
            value={state.rating}
            onChange={(value) => update("rating", value)}
            aria-label={copy.logViewing.ratingLabel}
          />
        </div>

        <div>
          <input
            type="text"
            value={state.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder={copy.logViewing.notePlaceholder}
            aria-label={copy.logViewing.noteLabel}
            className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
          />
        </div>

        <MoreFields state={state} update={update} />

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {isEditing ? copy.logViewing.saveChanges : copy.logViewing.submit}
        </Button>
      </form>
    </Sheet>
  );
}

function MoreFields({
  state,
  update,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const [open, setOpen] = useState(Boolean(state.place || state.company));

  return (
    <div>
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="text-footnote text-accent">
        {copy.logViewing.more}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="text"
            value={state.place}
            onChange={(event) => update("place", event.target.value)}
            placeholder={copy.logViewing.placePlaceholder}
            aria-label={copy.logViewing.placeLabel}
            className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
          />
          <input
            type="text"
            value={state.company}
            onChange={(event) => update("company", event.target.value)}
            placeholder={copy.logViewing.companyPlaceholder}
            aria-label={copy.logViewing.companyLabel}
            className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
          />
        </div>
      )}
    </div>
  );
}
