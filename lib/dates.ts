import type { WatchPrecision } from "@/lib/types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * watched_on is a Postgres `date` (no time component), serialised as
 * "YYYY-MM-DD". Parsing with the local Date constructor and reading
 * local getters would shift the date by a day for viewers west of UTC —
 * so this parses the parts directly instead of going through a Date at all.
 */
function parseDateParts(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month: month - 1, day };
}

type WatchedDateInput = {
  watchedOn: string | null;
  precision: WatchPrecision;
  eraLabel: string | null;
};

/**
 * Formats a viewing's date by its recorded precision (§9). A date is
 * never rendered more precisely than it was recorded — a year-precision
 * entry always reads "2017", never a fabricated "1 January 2017".
 */
export function formatWatchedDate({ watchedOn, precision, eraLabel }: WatchedDateInput): string {
  switch (precision) {
    case "day": {
      if (!watchedOn) return "Sometime";
      const { year, month, day } = parseDateParts(watchedOn);
      return `${day} ${MONTH_NAMES[month]} ${year}`;
    }
    case "month": {
      if (!watchedOn) return "Sometime";
      const { year, month } = parseDateParts(watchedOn);
      return `${MONTH_NAMES[month]} ${year}`;
    }
    case "year": {
      if (!watchedOn) return "Sometime";
      const { year } = parseDateParts(watchedOn);
      return `${year}`;
    }
    case "era":
      return eraLabel?.trim() || "Sometime";
    case "unknown":
    default:
      return "Sometime";
  }
}

/** "12 March 2017" for a full ISO timestamp (e.g. created_at) — stats'
 *  first/last logged, which track when an entry was added, not watched. */
export function formatLoggedDate(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2h 46m" — used on film detail; TMDB gives runtime in minutes. */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
