"use client";

import { useEffect } from "react";

/**
 * The last resort: the root layout itself threw, so this replaces it
 * entirely — which is why it renders its own <html> and <body>.
 *
 * Nothing from the app is available here. globals.css is imported by the
 * root layout that just failed, so there are no tokens, no utilities and
 * no Manrope; every value below is inlined on purpose and duplicates the
 * palette rather than referencing it. Reaching for a token or a shared
 * component here would produce an unstyled page at exactly the moment
 * the app has already failed once.
 *
 * That also rules out prefers-color-scheme via a stylesheet, so this one
 * screen is dark in both modes. A single hard-coded appearance is the
 * honest trade for a surface that must never itself break.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest ?? error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          background: "#090a10",
          color: "#f7f5fc",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main style={{ width: "100%", maxWidth: 620, padding: "0 clamp(20px, 6vw, 88px)" }}>
          {/* The mark, drawn inline for the same reason as everything
              else here — three rotated rectangles and a dot, no import. */}
          <span
            aria-label="SEEN"
            role="img"
            style={{ position: "relative", display: "block", width: 32, height: 32 }}
          >
            <span style={{ position: "absolute", left: 0, top: "12%", width: "56%", height: "72%", borderRadius: "22%", background: "#fe9e47", transform: "rotate(-14deg)" }} />
            <span style={{ position: "absolute", left: "16%", top: "8%", width: "56%", height: "76%", borderRadius: "22%", background: "#ccb8fb", transform: "rotate(-6deg)" }} />
            <span style={{ position: "absolute", left: "34%", top: "10%", width: "60%", height: "78%", borderRadius: "24%", background: "#5436ce", transform: "rotate(5deg)" }}>
              <span style={{ position: "absolute", right: "18%", top: "14%", width: "22%", height: "17%", borderRadius: "9999px", background: "#fff" }} />
            </span>
          </span>

          <h1
            style={{
              margin: "28px 0 0",
              fontFamily:
                '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "Nimbus Sans", sans-serif',
              fontWeight: 400,
              fontSize: "clamp(2.5rem, 1.4rem + 4.4vw, 4rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.045em",
            }}
          >
            Something broke.
          </h1>

          <p
            style={{
              margin: "20px 0 0",
              maxWidth: "46ch",
              fontSize: "1.0625rem",
              lineHeight: "1.5rem",
              letterSpacing: "-0.024em",
              color: "#a7a5b5",
            }}
          >
            SEEN failed to start. Your archive is safe — nothing here touches your
            logged viewings. Try again, and if it keeps happening, reload the page.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32,
              minHeight: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 16,
              background: "#5436ce",
              color: "#fff",
              font: "inherit",
              fontSize: "0.9375rem",
              fontWeight: 700,
              letterSpacing: "-0.014em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
