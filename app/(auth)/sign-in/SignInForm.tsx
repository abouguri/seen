"use client";

import { useState, type FormEvent } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";

/**
 * Presentation only — the auth call below is byte-for-byte the one that
 * was here before (signInWithOtp, same emailRedirectTo, same callback
 * route). What changed around it is the surface it sits on.
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
  /** Frozen at submit. Rendering `email` in the confirmation would let
   *  the address change under the message if state is ever reused. */
  const [sentTo, setSentTo] = useState("");

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
      setSentTo(email);
      setStatus("sent");
    } catch (thrown) {
      setFailure(classify(thrown));
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      /* The confirmation replaces the form rather than sitting above it:
         the only thing left to do is go and read an email. It rises in,
         because it arrives after a wait and a hard swap reads as the
         page having reloaded. */
      <div className="animate-[seen-rise_260ms_cubic-bezier(.4,0,.2,1)_both]">
        <p className="text-eyebrow text-warm-text">{copy.signIn.sentEyebrow}</p>
        <h1 className="text-display-1 mt-3.5 text-balance">{copy.signIn.sentTitle}</h1>
        <p className="text-body text-label-2 mt-5 max-w-[40ch] leading-6 text-pretty">
          {copy.signIn.sentPrefix}{" "}
          <span className="text-label font-bold">{sentTo}</span>.
        </p>
        <p className="text-footnote text-label-3 mt-2.5">{copy.signIn.sentHint}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setStatus("idle");
            setFailure(null);
            setEmail("");
          }}
          className="mt-7"
        >
          {copy.signIn.resend}
        </Button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <div>
      <p className="text-eyebrow text-label-3">{copy.signIn.eyebrow}</p>

      {/* The break is the design's, not the browser's — the second line
          is the one that turns, and it takes the accent. */}
      <h1 className="text-display-1 mt-3.5 text-balance">
        {copy.signIn.headlineLead}
        <br />
        <span className="text-accent-text">{copy.signIn.headlineAccent}</span>
      </h1>

      <p className="text-body text-label-2 mt-5.5 max-w-[40ch] leading-6 text-pretty">
        {copy.signIn.sub}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-[clamp(28px,4vh,40px)] flex max-w-115 flex-col gap-3.5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-footnote text-label-2 font-semibold">
            {copy.signIn.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={sending}
            placeholder={copy.signIn.emailPlaceholder}
            aria-invalid={failure !== null}
            aria-describedby={failure ? "sign-in-error" : undefined}
            /* auth-input replaces the global focus ring with a border
               move and a 4px glow — the field already has an edge, and
               an outline outside it reads as two borders. That class is
               the only place in the app allowed to say outline: none,
               and it draws the replacement in the same block. */
            className="auth-input text-body text-label placeholder:text-label-3 min-h-13 w-full rounded-md px-4"
          />
        </div>

        {/* Rendered whether or not there's a failure, and hidden with a
            class: role="alert" on a node that mounts with its message
            already in it is announced inconsistently across screen
            readers, where a live region that was already present when
            the text arrives is not. */}
        <p
          id="sign-in-error"
          role="alert"
          aria-live="polite"
          className={`text-footnote text-danger ${failure ? "" : "hidden"}`}
        >
          {failure ? FAILURE_COPY[failure] : ""}
        </p>

        <Button
          type="submit"
          disabled={sending}
          className="mt-1.5 min-h-13 w-full disabled:cursor-progress disabled:opacity-55"
        >
          {sending && (
            <span
              aria-hidden="true"
              className="size-4 animate-[seen-spin_700ms_linear_infinite] rounded-full border-2 border-white/35 border-t-white"
            />
          )}
          <span>{sending ? copy.signIn.sending : copy.signIn.submit}</span>
        </Button>

        <p className="text-footnote text-label-3 mt-0.5 text-pretty">{copy.signIn.formHint}</p>
      </form>
    </div>
  );
}
