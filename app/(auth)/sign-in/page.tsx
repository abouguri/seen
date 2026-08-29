import { SignInForm } from "./SignInForm";
import { TileField } from "@/components/auth/TileField";

/**
 * The only page a stranger meets, so it has to make the argument before
 * it asks for anything. The field behind the form is the argument: an
 * archive assembling itself out of empty 2:3 tiles, which is literally
 * what the product does. No posters — no image rights to clear, nothing
 * to download, and a grid of real covers would read as a catalogue,
 * which is the exact thing SEEN isn't.
 *
 * Layout is asymmetric above 900px: the column sits in the left third
 * and the field runs out to the right, which reads as considered where a
 * dead-centre box reads as a template. Below that the column centres and
 * the field simply sits behind it.
 *
 * Sign-in is outside the (app) group, so PatternBackdrop never runs
 * here — the field is this page's texture and the two would fight.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative isolate flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-16 min-[900px]:px-[7vw]">
      <TileField />

      {/* Keeps the form dominant. A wash of the page ground over the
          field, opaque under the column and clearing to nothing on the
          right — so the tiles are legible where there's nothing else and
          recede where they'd compete with type. Vertical on narrow
          viewports, where the column sits over the middle of the field
          and needs cover on both sides instead. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_66%_46%_at_50%_50%,var(--bg)_0%,var(--bg)_58%,transparent_100%)] min-[900px]:bg-[linear-gradient(to_right,var(--bg)_0%,var(--bg)_36%,transparent_76%)]"
      />

      <div className="mx-auto w-full max-w-[380px] min-[900px]:mx-0">
        <SignInForm hadCallbackError={params.error === "callback"} />
      </div>
    </main>
  );
}
