"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error" | "callback-error";

export function SignInForm({ hadCallbackError }: { hadCallbackError: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(
    hadCallbackError ? "callback-error" : "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-headline text-label-2 mb-1">{APP_NAME}</p>
      <h1 className="text-large-title mb-6">{copy.signIn.title}</h1>

      {status === "sent" ? (
        <div>
          <p className="text-body text-label-2">
            {copy.signIn.sentPrefix} <span className="text-label">{email}</span>.
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-subhead text-accent-text mt-4"
          >
            {copy.signIn.resend}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="text-body text-label-2 mb-6">{copy.signIn.subtitle}</p>

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
            className="text-body border-separator bg-surface-1 text-label placeholder:text-label-3 mb-4 min-h-11 w-full rounded-md border px-4 outline-none"
          />

          {status === "error" && (
            <p className="text-footnote text-danger mb-4">{copy.signIn.errorSend}</p>
          )}
          {status === "callback-error" && (
            <p className="text-footnote text-danger mb-4">{copy.signIn.errorCallback}</p>
          )}

          <Button type="submit" disabled={status === "sending"} className="w-full">
            {status === "sending" ? copy.signIn.sending : copy.signIn.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
