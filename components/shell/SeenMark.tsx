/**
 * The SEEN mark — three posters fanned into a stack, the top one wearing
 * the app's one white dot. Drawn rather than shipped as an SVG asset so
 * it inherits the palette: the three cards are the accent, the accent's
 * text tint, and the warm secondary, which means it re-tints itself in
 * light mode along with everything else.
 *
 * Purely decorative — every place it appears is already labelled (the
 * nav rail's home link names itself in text for screen readers), so it's
 * aria-hidden and carries no title of its own.
 */
export function SeenMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative block shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="bg-warm absolute rounded-[22%]"
        style={{ left: 0, top: "12%", width: "56%", height: "72%", transform: "rotate(-14deg)" }}
      />
      <span
        className="bg-accent-text absolute rounded-[22%]"
        style={{ left: "16%", top: "8%", width: "56%", height: "76%", transform: "rotate(-6deg)" }}
      />
      <span
        className="bg-accent absolute rounded-[24%]"
        style={{ left: "34%", top: "10%", width: "60%", height: "78%", transform: "rotate(5deg)" }}
      >
        {/* The one white dot — the "seen" mark the whole app is named
            for. Small enough to read as a mark rather than a hole. */}
        <span
          className="absolute rounded-full bg-white"
          style={{ right: "18%", top: "14%", width: "22%", height: "17%" }}
        />
      </span>
    </span>
  );
}

/**
 * The lockup — the mark plus the "seen" wordmark.
 *
 * Two things here come from the official artwork rather than from
 * anyone's idea of a good logo, and both are easy to get wrong:
 *
 * 1. The wordmark is lowercase. "seen", not "SEEN".
 * 2. The mark keeps its colours in every variant. The light and dark
 *    versions of the official lockup differ only in the wordmark — dark
 *    ink on light grounds, white on dark — and the orange/lilac/violet
 *    fan is identical in both. So `tone` here controls the *word*, not
 *    the mark, and the default resolves through --label, which already
 *    flips with the theme. A one-colour mark is not a variant that
 *    exists; `tone="mono"` only inherits currentColor for the word.
 *
 * The type is Manrope, the app's own text face, at its heaviest weight.
 * That is a stand-in, not a match: the official wordmark's face isn't in
 * this repo and isn't named anywhere in it, so rather than guess at a
 * lookalike and download a third font for it, this uses what SEEN
 * already loads. If the real face turns up, this is the only place it
 * needs to change.
 *
 * Sizing is proportional to the mark so the lockup holds together at any
 * size: the wordmark's x-height sits at ~38% of the mark's box, matching
 * the artwork, which over Manrope's 0.54em x-height puts the font-size
 * at 0.70 x size.
 */
export function SeenLockup({
  size = 40,
  tone = "full",
}: {
  size?: number;
  tone?: "full" | "mono";
}) {
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: size * 0.06 }}
      role="img"
      aria-label="SEEN"
    >
      <SeenMark size={size} />
      <span
        aria-hidden="true"
        style={{
          fontSize: size * 0.7,
          lineHeight: 1,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: tone === "mono" ? "currentColor" : "var(--label)",
        }}
      >
        seen
      </span>
    </span>
  );
}
