import { SeenMark } from "@/components/shell/SeenMark";

type EmptyStateProps = {
  title: string;
  body?: string;
  /** A button or link. Optional — "no results for this filter" has nothing
   *  useful to offer beyond changing the filter you can already see. */
  action?: React.ReactNode;
  /** Set for genuine failures. Swaps the mark for the message in the
   *  danger tint — an error dressed as an empty state reads as "you have
   *  nothing", which is the wrong thing to tell someone whose request
   *  just failed. */
  tone?: "empty" | "error";
};

/**
 * The shared nothing-here surface: a bordered card carrying the quietest
 * pattern in the family, with the logo's stacked mark above the message.
 *
 * These are the only screens with no posters on them, so the pattern has
 * to hold the surface by itself — hence a card with a visible edge rather
 * than the bare centred paragraph this replaces. It's also why this is
 * the one place the mark appears outside the nav: an empty archive should
 * still look like the archive.
 */
export function EmptyState({ title, body, action, tone = "empty" }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="border-separator bg-surface-1/60 pattern-memory-frames squircle w-full max-w-105 rounded-lg border px-6 py-10 text-center">
        {tone === "empty" && (
          <div className="mb-5 flex justify-center">
            <SeenMark size={56} />
          </div>
        )}
        <h2 className={tone === "error" ? "text-display-2 text-danger" : "text-display-2"}>
          {title}
        </h2>
        {body && <p className="text-subhead text-label-2 mx-auto mt-3 max-w-[38ch]">{body}</p>}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
