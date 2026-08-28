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
