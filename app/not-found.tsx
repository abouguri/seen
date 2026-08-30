import Link from "next/link";
import { FullPageNotice } from "@/components/shared/FullPageNotice";
import { buttonClasses } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

/**
 * The 404. Renders inside RootLayout, so it inherits the fonts, the
 * tokens and the theme script — which is the whole reason this is a
 * route convention rather than a component someone has to remember to
 * wrap.
 *
 * Next also has an experimental `global-not-found` convention that
 * replaces the root layout entirely. Not used here: it's behind
 * `experimental.globalNotFound` (false by default in this version), and
 * inheriting the layout is the behaviour we want anyway.
 */
export default function NotFound() {
  return (
    <FullPageNotice
      eyebrow={copy.notFound.eyebrow}
      title={copy.notFound.title}
      body={copy.notFound.body}
      action={
        <Link href="/library" className={buttonClasses()}>
          {copy.notFound.action}
        </Link>
      }
    />
  );
}
