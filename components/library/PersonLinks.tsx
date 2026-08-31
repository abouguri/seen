import Link from "next/link";
import { Fragment } from "react";

type PersonLinksProps = {
  names: string[];
};

/**
 * A comma-separated list of names, each linking to /people/[name] —
 * shared by directors and cast, both plain-text arrays with no TMDB
 * person id attached (the DB stores names only, same as `directors`
 * always has). The person page resolves the name back to TMDB itself,
 * the same way the homepage's "complete the director" shelf already
 * does. Inherits the surrounding text's styling — used inline in a meta
 * line and as its own block, never with its own font size/color.
 */
export function PersonLinks({ names }: PersonLinksProps) {
  return (
    <>
      {names.map((name, index) => (
        <Fragment key={name}>
          {index > 0 && ", "}
          <Link href={`/people/${encodeURIComponent(name)}`} className="rounded-xs outline-offset-2 hover:underline">
            {name}
          </Link>
        </Fragment>
      ))}
    </>
  );
}
