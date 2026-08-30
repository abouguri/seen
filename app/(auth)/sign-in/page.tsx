import { SignInForm } from "./SignInForm";
import { MarkCluster } from "@/components/auth/MarkCluster";
import { SeenLockup } from "@/components/shell/SeenMark";
import { copy } from "@/lib/copy";

/**
 * The only page a stranger meets, so it has to make the argument before
 * it asks for anything — and it is the one screen with no content of its
 * own to show, so it brings its own atmosphere.
 *
 * Five background layers, back to front:
 *
 *   0  a ledger grid, anchored to the right edge
 *   1  two radial washes, cool from the top right, warm from the bottom
 *   2  the mark, blown up and drifting (MarkCluster)
 *   3  a veil of the page ground, opaque on the left, clear on the right
 *   4  film grain over the lot
 *
 * Layer 3 is the one doing the real work. Everything behind it is busy,
 * and the veil is what buys the headline a plain ground to sit on
 * without having to dim the composition itself — the type keeps full
 * contrast on the left while the stack stays fully visible on the right.
 *
 * Content is left-aligned in a 620px column rather than centred: a
 * dead-centre box reads as a template, and the asymmetry is what leaves
 * the right half free for the mark.
 *
 * Sign-in is outside the (app) group, so PatternBackdrop never runs
 * here — this composition is the page's texture and the two would fight.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="bg-bg text-label relative isolate flex min-h-dvh flex-col overflow-hidden">
      {/* Anchored to the right edge (background-position 100% 0) so the
          ruled lines stay put behind the mark as the viewport changes,
          instead of sliding under the column. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(var(--ledger)_1px,transparent_1px),linear-gradient(90deg,var(--ledger)_1px,transparent_1px)] bg-position-[100%_0] bg-size-[112px_152px]"
      />

      {/* Two washes, cool then warm, both well off-canvas so only the
          falloff lands on the page. Light mode sends both warm — a cool
          wash over paper reads as a grey stain rather than as light. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(ellipse_at_112%_-12%,color-mix(in_srgb,var(--wash-cool)_var(--wash-alpha),transparent)_0_26%,transparent_52%),radial-gradient(ellipse_at_78%_118%,color-mix(in_srgb,var(--warm)_var(--wash-alpha),transparent)_0_24%,transparent_48%)] bg-size-[100%_100%] bg-no-repeat"
      />

      <MarkCluster />

      <div aria-hidden="true" className="auth-veil pointer-events-none absolute inset-0 z-3" />

      {/* Three offset dot fields at co-prime tile sizes — 17/23/29px
          never line up, so this reads as grain rather than as a pattern.
          Sits above the veil: grain under a wash isn't grain. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-4 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--grain-cool)_var(--grain-alpha),transparent)_0_0.55px,transparent_0.8px),radial-gradient(circle_at_70%_35%,color-mix(in_srgb,var(--grain-warm)_var(--grain-alpha),transparent)_0_0.45px,transparent_0.75px),radial-gradient(circle_at_40%_80%,color-mix(in_srgb,var(--grain-cool)_var(--grain-alpha),transparent)_0_0.4px,transparent_0.7px)] bg-size-[17px_17px,23px_23px,29px_29px]"
      />

      <header className="relative z-5 flex items-center px-[clamp(20px,6vw,88px)] py-[clamp(20px,3vw,36px)]">
        <SeenLockup size={32} />
      </header>

      <main className="relative z-5 flex flex-1 items-center px-[clamp(20px,6vw,88px)] pb-[clamp(40px,7vh,88px)]">
        <div className="w-full max-w-155">
          <SignInForm hadCallbackError={params.error === "callback"} />
        </div>
      </main>

      <footer className="text-caption text-label-3 relative z-5 flex flex-wrap gap-x-5 gap-y-1.5 px-[clamp(20px,6vw,88px)] pb-[clamp(20px,3vw,32px)]">
        <span>{copy.signIn.footerPrivate}</span>
        <span aria-hidden="true" className="text-separator-strong">
          /
        </span>
        <span>{copy.signIn.footerShared}</span>
      </footer>
    </div>
  );
}
