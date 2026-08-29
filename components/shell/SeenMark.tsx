/**
 * The SEEN mark — "The Stack": three 2:3 poster rectangles offset
 * diagonally so they read as spines on a shelf. It encodes accumulation,
 * which is the thing the product actually measures, and it's built from
 * the same 2:3 rectangle as every card in the app.
 *
 * Geometry, in a 24-unit box
 * -------------------------
 * Each card is 11×16.5 (exactly 2:3), rx 2 — which is the ~4px corner
 * the brief asks for once the mark is drawn at 48px. The three step by
 * (6, 2.75), putting the stack at 0.5..23.5 across and 1..23 down.
 *
 * Those numbers are the result of testing at 16px rather than designing
 * at 40. The first pass used 12×18 cards stepping by (5, 2), which is
 * the largest card that fits three across a 24-unit box — and at 16px
 * the 3.3px sliver left showing past each card collapsed into what read
 * as a drop shadow on a single rectangle. Shrinking the card to 11 buys
 * a 6-unit step (4px at 16px) and that is the difference between three
 * cards and one. The step is larger horizontally than vertically on
 * purpose: a 2:3 card in a square box has far more room sideways, and
 * spines on a shelf lean that way anyway.
 *
 * The opacity ramp starts at 0.55 rather than the 0.38 that looked right
 * at 40px, for the same reason — at 16px the back card has only a 4px
 * sliver to make its case with, and a 38% tint over the near-black
 * ground doesn't survive it.
 *
 * Colour
 * ------
 * One fill, three opacities, which is what makes both tones fall out of
 * the same markup: 'full' steps the accent from dim violet to the full
 * accent, 'mono' does the same in currentColor so the stack still reads
 * as three cards when the whole mark is one colour. Compositing against
 * whatever is behind it is the point — the dim card is a *tint* of the
 * surface it sits on, so the mark re-tints itself in light mode along
 * with everything else rather than needing a second set of values.
 *
 * Decorative by default: every place it appears is already labelled, so
 * it's aria-hidden unless a `title` is passed.
 */

type Tone = "full" | "mono";

/** x/y of each card's top-left, back to front, and its opacity. */
const CARDS = [
  { x: 0.5, y: 1, opacity: 0.55 },
  { x: 6.5, y: 3.75, opacity: 0.78 },
  { x: 12.5, y: 6.5, opacity: 1 },
] as const;

const CARD_W = 11;
const CARD_H = 16.5;

export function SeenMark({
  size = 40,
  tone = "full",
  title,
}: {
  size?: number;
  tone?: Tone;
  title?: string;
}) {
  const fill = tone === "mono" ? "currentColor" : "var(--accent)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="block shrink-0"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {CARDS.map((card) => (
        <rect
          key={card.x}
          x={card.x}
          y={card.y}
          width={CARD_W}
          height={CARD_H}
          rx={2}
          fill={fill}
          opacity={card.opacity}
        />
      ))}
    </svg>
  );
}

/**
 * Mark plus wordmark, optically aligned.
 *
 * The brief is that the wordmark's cap-height matches the height of the
 * front-most rectangle. That front card is 16.5 of 24 units tall, so the
 * cap-height wants to be 0.6875 × size; Inter's cap-height is 0.7275em,
 * which puts the font-size at 0.6875 / 0.7275 = 0.945 × size. That is
 * why the type is set off the mark's size rather than a round px value —
 * change the geometry above and the wordmark follows it.
 *
 * Vertical alignment takes two corrections, and both matter at 20px:
 *
 * 1. With line-height 1, Inter's cap-height centre lands exactly on the
 *    centre of the line box — half-leading is (1 − 1.21)/2 = −0.105em,
 *    so cap-centre sits at −0.105 + 0.96875 − 0.36375 = 0.5em from the
 *    top. So centring the *box* centres the caps. Only true because
 *    line-height is pinned to 1; the default would break it.
 *
 * 2. The front card is not centred in the mark — it spans y 6.5..23, so
 *    its centre is at 14.75/24 = 0.6146 of the box, not 0.5. Flex
 *    centring would align the caps to the mark's centre, which is
 *    0.1146 × size too high. Hence the translate.
 *
 * Inter is loaded for exactly this (one weight, self-hosted via
 * next/font) and used nowhere else — the wordmark is the one piece of
 * type in the app that has to be the same shape everywhere it appears,
 * which is the argument for not letting it fall through to the UI face.
 */
export function SeenLockup({
  size = 20,
  tone = "full",
}: {
  size?: number;
  tone?: Tone;
}) {
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: size * 0.22 }}
      role="img"
      aria-label="SEEN"
    >
      <SeenMark size={size} tone={tone} />
      <span
        aria-hidden="true"
        className="font-lockup"
        style={{
          fontSize: size * 0.945,
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          // See note 2 above: nudge the caps down onto the front card.
          transform: `translateY(${size * 0.1146}px)`,
          color: tone === "mono" ? "currentColor" : "var(--label)",
        }}
      >
        SEEN
      </span>
    </span>
  );
}
