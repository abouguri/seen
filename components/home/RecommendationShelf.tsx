import { RecommendationCard } from "@/components/home/RecommendationCard";
import type { Shelf } from "@/lib/recommendations/types";

/**
 * A shelf: heading, its because-line, and a capped grid.
 *
 * A grid rather than a carousel, and no horizontal scroll — the page is
 * meant to end. Six is the cap, and because the engine only ever
 * computes six there is no "See all" link: a link to a page holding the
 * same six items would be a dead end dressed up as depth.
 *
 * The heading takes the display face, so a shelf reads as a section of
 * the same page the hero opened rather than as a widget bolted under it.
 * Nothing else here is decorated: the shelves sit on plain ground on
 * purpose, because six posters across is already the densest thing on
 * the screen and a texture behind them is a moiré.
 *
 * A shelf with nothing to say never reaches this component — the engine
 * drops it — so there is no empty branch here on purpose. An empty shelf
 * with a placeholder is the failure mode this feature is built against.
 */
export function RecommendationShelf({ shelf }: { shelf: Shelf }) {
  return (
    <section className="mt-16">
      <h2 className="text-display-2 text-balance">{shelf.title}</h2>
      <p className="text-subhead text-label-2 mt-2 max-w-prose text-pretty">{shelf.reason}</p>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shelf.items.map((film) => (
          <RecommendationCard key={film.id} film={film} />
        ))}
      </ul>
    </section>
  );
}
