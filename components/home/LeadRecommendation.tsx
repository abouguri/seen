import { LeadCard } from "@/components/home/LeadCard";
import { getFilmDetail } from "@/lib/tmdb/get-detail";
import type { Recommendation } from "@/lib/recommendations/types";

/**
 * The lead: one film, argued. Not a carousel — the page opens by making
 * a single case properly rather than by fanning out twenty options.
 *
 * This half is the lookup; LeadCard is everything you see. Director,
 * runtime and the backdrop come from getFilmDetail, which reads the
 * films table first and only reaches TMDB on a miss (refreshing in the
 * background when stale), so the extra metadata costs one indexed row
 * read on the common path rather than a network round trip.
 *
 * A failed lookup is passed through as null rather than caught here —
 * LeadCard guards every use of it, and the card is designed to hold
 * without a backdrop because plenty of older films simply don't have
 * one.
 */
export async function LeadRecommendation({ film }: { film: Recommendation }) {
  const detail = await getFilmDetail(film.id);
  return <LeadCard film={film} meta={detail.status === "ok" ? detail.film : null} />;
}
