"use client";

import { useState, type FormEvent } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { SeenLockup } from "@/components/shell/SeenMark";

/**
 * Presentation only — the auth call below is byte-for-byte the one that
 * was here before (signInWithOtp, same emailRedirectTo, same callback
 * route). What changed around it is the failure handling and the page it
 * sits on.
 */

type Failure = "email" | "rate-limited" | "offline" | "server" | "callback";
type Status = "idle" | "sending" | "sent";

const FAILURE_COPY: Record<Failure, string> = {
  email: copy.signIn.errorEmail,
  "rate-limited": copy.signIn.errorRateLimited,
  offline: copy.signIn.errorOffline,
  server: copy.signIn.errorServer,
  callback: copy.signIn.errorCallback,
};

/**
 * Sorts what actually came back into the four things that can go wrong.
 * Supabase's AuthError carries both an HTTP `status` and, on newer
 * releases, a stable `code`; the code is checked first because it
 * survives status changes, with status as the fallback.
 *
 * The offline case is the one that used to be missing entirely: the old
 * version awaited signInWithOtp with no try/catch, so a dropped
 * connection rejected the promise and left the button stuck on
 * "Sending link…" with nothing said. A fetch failure never arrives as a
 * returned error — it throws — which is why classify() is called from
 * both branches.
 */
function classify(error: unknown): Failure {
  const code = (error as AuthError)?.code;
  const status = (error as AuthError)?.status;

  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "rate-limited";
  }
  if (code === "validation_failed" || code === "email_address_invalid") return "email";
  if (status === 429) return "rate-limited";
  if (status === 400 || status === 422) return "email";
  // A thrown TypeError from fetch, or Supabase's own retryable wrapper,
  // both mean the request never reached anyone.
  if (status === undefined || status === 0) return "offline";
  return "server";
}

export function SignInForm({ hadCallbackError }: { hadCallbackError: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<Failure | null>(
    hadCallbackError ? "callback" : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFailure(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setFailure(classify(error));
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch (thrown) {
      setFailure(classify(thrown));
      setStatus("idle");
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <SeenLockup size={28} />

      {status === "sent" ? (
        <>
          {/* The confirmation replaces the form rather than sitting above
              it: the only thing left to do is go and read an email. */}
          <h1 className="text-display-2 mt-7 mb-3">Check your email</h1>
          <p className="text-body text-label-2">
            {copy.signIn.sentPrefix}{" "}
            <span className="text-label font-bold">{email}</span>.
          </p>
          <p className="text-footnote text-label-3 mt-2">{copy.signIn.sentHint}</p>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setFailure(null);
            }}
            className="text-subhead text-accent-text focus-visible:outline-accent mt-6 rounded-xs font-bold outline-offset-2"
          >
            {copy.signIn.resend}
          </button>
        </>
      ) : (
        <>
          {/* 28px below the lockup, per the brief — mt-7. */}
          <h1
            className="mt-7 font-bold text-balance"
            style={{
              fontSize: "var(--fs-large-title)",
              lineHeight: "var(--lh-large-title)",
              letterSpacing: "var(--ls-large-title)",
            }}
          >
            {copy.signIn.headline}
          </h1>
          <p className="text-body text-label-2 mt-4 text-pretty">{copy.signIn.sub}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8">
            <label htmlFor="email" className="text-footnote text-label-2 mb-2 block">
              {copy.signIn.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.signIn.emailPlaceholder}
              aria-invalid={failure === "email"}
              aria-describedby={failure ? "sign-in-error" : undefined}
              /* No outline-none here. It was on this input before and it
                 silently cost the field its focus ring: outline-none sets
                 outline-style to none from the utilities layer, and the
                 focus-visible:outline-accent beside it only sets a
                 colour — so the global :focus-visible rule in globals.css
                 had its style overridden and drew nothing. Measured at
                 2px none rather than 2px solid. Dropping it lets the
                 global rule land. */
              className="text-body border-separator bg-surface-1 text-label placeholder:text-label-3 focus-visible:outline-accent min-h-11 w-full rounded-md border px-4 outline-offset-2"
            />

            {failure && (
              /* aria-live so the message is announced when it replaces a
                 previous one — the text changes but the node doesn't, so
                 without it a screen reader can miss the swap. */
              <p
                id="sign-in-error"
                role="alert"
                aria-live="polite"
                className="text-footnote text-danger mt-3"
              >
                {FAILURE_COPY[failure]}
              </p>
            )}

            <Button type="submit" disabled={status === "sending"} className="mt-5 w-full">
              {status === "sending" ? copy.signIn.sending : copy.signIn.submit}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
