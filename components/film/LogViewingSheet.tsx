"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import type { WatchPrecision } from "@/lib/types";

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

type LogViewingSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LogViewingInput) => void;
};

export function LogViewingSheet({ open, onClose, onSubmit }: LogViewingSheetProps) {
  const [whenMode, setWhenMode] = useState<WhenMode>("today");
  const [dateValue, setDateValue] = useState("");
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));
  const [eraValue, setEraValue] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [company, setCompany] = useState("");

  const canSubmit =
    whenMode !== "pickDate" || dateValue.length > 0;

  function reset() {
    setWhenMode("today");
    setDateValue("");
    setYearValue(String(new Date().getFullYear()));
    setEraValue("");
    setRating(null);
    setNote("");
    setMoreOpen(false);
    setPlace("");
    setCompany("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    let watchedOn: string | null = null;
    let precision: WatchPrecision = "unknown";
    let eraLabel: string | null = null;

    switch (whenMode) {
      case "today":
        watchedOn = localTodayIsoDate();
        precision = "day";
        break;
      case "pickDate":
        watchedOn = dateValue;
        precision = "day";
        break;
      case "year":
        watchedOn = `${yearValue}-01-01`;
        precision = "year";
        break;
      case "roughly":
        precision = "era";
        eraLabel = eraValue.trim() || null;
        break;
      case "unknown":
        precision = "unknown";
        break;
    }

    onSubmit({
      watchedOn,
      precision,
      eraLabel,
      rating,
      note: note.trim() || null,
      place: place.trim() || null,
      company: company.trim() || null,
    });
    reset();
  }

  return (
    <Sheet open={open} onClose={onClose} title={copy.logViewing.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <p className="text-footnote text-label-2 mb-2">{copy.logViewing.whenLabel}</p>
          <Segmented
            options={WHEN_OPTIONS}
            value={whenMode}
            onChange={setWhenMode}
            aria-label={copy.logViewing.whenLabel}
          />

          {whenMode === "pickDate" && (
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              max={localTodayIsoDate()}
              aria-label={copy.logViewing.dateLabel}
              className="text-body bg-surface-2 text-label mt-3 min-h-11 w-full rounded-md px-3 outline-none"
            />
          )}

          {whenMode === "year" && (
            <input
              type="number"
              inputMode="numeric"
              value={yearValue}
              onChange={(event) => setYearValue(event.target.value)}
              min={1888}
              max={new Date().getFullYear()}
              aria-label={copy.logViewing.yearLabel}
              className="text-body bg-surface-2 text-label mt-3 min-h-11 w-32 rounded-md px-3 outline-none"
            />
          )}

          {whenMode === "roughly" && (
            <div className="mt-3">
              <input
                type="text"
                value={eraValue}
                onChange={(event) => setEraValue(event.target.value)}
                placeholder={copy.logViewing.eraPlaceholder}
                aria-label={copy.logViewing.eraLabel}
                className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {copy.logViewing.eraSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setEraValue(suggestion)}
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
          <StarRating value={rating} onChange={setRating} aria-label={copy.logViewing.ratingLabel} />
        </div>

        <div>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.logViewing.notePlaceholder}
            aria-label={copy.logViewing.noteLabel}
            className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className="text-footnote text-accent"
          >
            {copy.logViewing.more}
          </button>

          {moreOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="text"
                value={place}
                onChange={(event) => setPlace(event.target.value)}
                placeholder={copy.logViewing.placePlaceholder}
                aria-label={copy.logViewing.placeLabel}
                className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
              />
              <input
                type="text"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder={copy.logViewing.companyPlaceholder}
                aria-label={copy.logViewing.companyLabel}
                className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 w-full rounded-md px-3 outline-none"
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {copy.logViewing.submit}
        </Button>
      </form>
    </Sheet>
  );
}
