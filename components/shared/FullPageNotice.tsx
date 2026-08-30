import { SeenLockup } from "@/components/shell/SeenMark";

/**
 * The surface for the two moments the app has nothing to show: a URL
 * that doesn't exist, and a render that threw.
 *
 * It lives outside the (app) group's shell, so there is no nav rail to
 * get back with — which is exactly why it carries the lockup and its own
 * way out. A dead end with no branding and no link is the one screen
 * that can make a working app feel broken.
 *
 * Deliberately the sign-in page's composition minus the composition: the
 * same left-aligned column, eyebrow, display headline and body, on the
 * plain ground. Something has already gone wrong here; a drifting mark
 * and two radial washes would be dressing up an apology.
 */
export function FullPageNotice({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  /** A link home, or a retry. Never optional — the whole point of this
   *  surface is that it offers a way out. */
  action: React.ReactNode;
}) {
  return (
    <div className="bg-bg text-label flex min-h-dvh flex-col">
      <header className="flex items-center px-[clamp(20px,6vw,88px)] py-[clamp(20px,3vw,36px)]">
        <SeenLockup size={32} />
      </header>

      <main className="flex flex-1 items-center px-[clamp(20px,6vw,88px)] pb-[clamp(40px,7vh,88px)]">
        <div className="w-full max-w-155">
          <p className="text-eyebrow text-label-3">{eyebrow}</p>
          <h1 className="text-display-1 mt-3.5 text-balance">{title}</h1>
          <p className="text-body text-label-2 mt-5 max-w-[46ch] leading-6 text-pretty">{body}</p>
          <div className="mt-8">{action}</div>
        </div>
      </main>
    </div>
  );
}
