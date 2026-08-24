import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <SignInForm hadCallbackError={params.error === "callback"} />
    </main>
  );
}
