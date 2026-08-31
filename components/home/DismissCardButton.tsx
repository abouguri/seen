"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { dismissRecommendation } from "@/lib/recommendations/actions";
import { copy } from "@/lib/copy";

/**
 * The shelf-card sibling of DismissButton — same server action, same
 * "no optimistic removal, the pending state ends when the revalidated
 * page arrives" behavior, but a compact overlay control instead of a
 * full ghost button: a poster in a 6-across grid has no room for one.
 * Mirrors the rewatch badge's own overlay treatment on this card
 * (RecommendationCard.tsx) so the two read as the same visual language,
 * positioned opposite it (top-right vs. top-left) so they never collide.
 */
export function DismissCardButton({ filmId, title }: { filmId: number; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={copy.home.leadDismissLabel(title)}
      onClick={() => startTransition(() => dismissRecommendation(filmId))}
      className="bg-scrim/70 text-label border-separator-strong absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-md outline-offset-2 disabled:opacity-50"
    >
      <X size={14} strokeWidth={2.5} />
    </button>
  );
}
