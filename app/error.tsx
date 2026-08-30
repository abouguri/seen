"use client";

import { useEffect } from "react";
import { FullPageNotice } from "@/components/shared/FullPageNotice";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

/**
 * The recoverable error boundary: a render below the root layout threw.
 *
 * Must be a client component — it takes `reset`, which re-renders the
 * segment. That is a real recovery for what fails in this app: a TMDB
 * call that timed out, a Supabase read that lost its connection. Trying
 * again is usually enough, so the primary action is retry and not a link
 * away from wherever the person was.
 *
 * The message deliberately doesn't show `error.message`. In production
 * React replaces it with a generic string anyway, and the useful handle
 * is `error.digest` — which is logged, not printed at someone.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled render error", error.digest ?? error);
  }, [error]);

  return (
    <FullPageNotice
      eyebrow={copy.appError.eyebrow}
      title={copy.appError.title}
      body={copy.appError.body}
      action={<Button onClick={reset}>{copy.appError.action}</Button>}
    />
  );
}
