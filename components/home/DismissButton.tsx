"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { dismissRecommendation } from "@/lib/recommendations/actions";

/**
 * "Not for me" — the ghost half of the lead's two actions.
 *
 * The only client component on the homepage. Everything else renders on
 * the server; this needs a transition so the row can say it's working
 * while the server action writes the dismissal and revalidates. When the
 * revalidation lands the page re-renders with a different lead, so
 * there's no optimistic removal to manage here — the pending state ends
 * when the new lead arrives.
 */
export function DismissButton({ filmId, title }: { filmId: number; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      disabled={pending}
      aria-label={`Not for me — don't recommend ${title} again`}
      onClick={() => startTransition(() => dismissRecommendation(filmId))}
    >
      {pending ? "Dismissing…" : "Not for me"}
    </Button>
  );
}
