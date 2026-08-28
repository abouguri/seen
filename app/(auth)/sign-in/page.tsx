import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6">
      {/* Sign-in sits outside the (app) group, so PatternBackdrop never
          runs here — it carries its own texture. Light thrown across an
          otherwise empty room, which is all this screen is. */}
      <div
        aria-hidden="true"
        className="pattern-layer pattern-archive-grain fixed -z-10"
      />
      <div
        aria-hidden="true"
        className="pattern-layer pattern-projector-veil fixed -z-10"
      />
      <SignInForm hadCallbackError={params.error === "callback"} />
    </main>
  );
}
