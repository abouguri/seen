import { APP_NAME } from "@/lib/constants";

/**
 * Every user-facing string lives here (§02: English-only in v1, but
 * centralised so localisation later is a config change, not a rewrite).
 * Voice rules (§7.6): sentence case, no exclamation marks, no emoji.
 * Errors say what happened and what to do; empty states invite action.
 */
export const copy = {
  signIn: {
    title: "Sign in",
    subtitle: `Enter your email and we'll send you a link to sign in to ${APP_NAME}.`,
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    submit: "Send magic link",
    sending: "Sending link…",
    sentPrefix: "Check your email — we sent a sign-in link to",
    resend: "Use a different email",
    errorSend: "Couldn't send the link. Check your email address and try again.",
    errorCallback: "That link didn't work. Request a new one below.",
  },
  nav: {
    library: "Library",
    add: "Add",
    search: "Search",
    stats: "Stats",
  },
  library: {
    title: "Library",
    emptyMessage:
      "Nothing here yet. Tap Add and start with a decade you remember well.",
  },
  placeholder: {
    add: "Add isn't built yet — it lands in a later milestone.",
    search: "Search isn't built yet — it lands in a later milestone.",
    stats: "Stats isn't built yet — it lands in a later milestone.",
  },
  account: {
    signOut: "Sign out",
  },
} as const;
