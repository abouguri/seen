import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { LeadRecommendation } from "@/components/home/LeadRecommendation";
import { RecommendationShelf } from "@/components/home/RecommendationShelf";
import { loadArchive } from "@/lib/recommendations/archive";
import { buildRecommendations, THIN_ARCHIVE } from "@/lib/recommendations/engine";
import { copy } from "@/lib/copy";

/**
 * The homepage — recommendations drawn from the archive, not a
 * catalogue.
 *
 * A server component start to finish: the TMDB token never leaves the
 * server, and the only interactive piece on the page (DismissButton)
 * is an island inside the lead.
 *
 * Three states, and they are the point rather than edge cases. A
 * recommender that looks broken on day one is the usual way this feature
 * fails, so an empty archive gets a real empty state that routes to
 * /add, a thin one gets a reduced page that says out loud how thin it
 * is, and only a real archive gets the full thing. None of the three can
 * render an empty shelf: the engine drops a section with nothing to say
 * before it ever reaches a component.
 */
export default async function HomePage() {
  const archive = await loadArchive();
  if (!archive) return null; // middleware redirects; nothing to render.

  const { libraryCount, lead, shelves } = await buildRecommendations(archive);

  return (
    <div className="mx-auto w-full max-w-350 px-4 pt-7 pb-20 md:px-9">
      <header>
        <p className="text-eyebrow text-label-3">{copy.home.eyebrow}</p>
        <h1 className="text-display-1 mt-3">{copy.home.title}</h1>

        {libraryCount === 0 ? (
          <p className="text-body text-label-2 mt-4 max-w-prose text-pretty">
            {copy.home.emptyBody}
          </p>
        ) : libraryCount < THIN_ARCHIVE ? (
          /* Says how thin the archive is rather than quietly showing
             less. The number is the honest part — "still learning" on its
             own would read as a stall. */
          <p className="text-body text-label-2 mt-4 max-w-prose text-pretty">
            {copy.home.learning(libraryCount)}
          </p>
        ) : (
          <p className="text-body text-label-2 mt-4 max-w-prose text-pretty">
            {copy.home.subtitle}
          </p>
        )}
      </header>

      {libraryCount === 0 ? (
        <div className="mt-8">
          <Link href="/add" className={buttonClasses()}>
            {copy.home.emptyCta}
          </Link>
          <p className="text-footnote text-label-3 mt-4">{copy.home.emptyHint}</p>
        </div>
      ) : (
        <>
          {lead && (
            <div className="mt-8">
              <LeadRecommendation film={lead} />
            </div>
          )}

          {shelves.map((shelf) => (
            <RecommendationShelf key={`${shelf.kind}-${shelf.title}`} shelf={shelf} />
          ))}

          {/* The archive has films but nothing true could be said about
              them — every TMDB-backed section came back empty, or the
              user has dismissed their way through the candidates. Better
              than a page of placeholders. */}
          {!lead && shelves.length === 0 && (
            <p className="text-body text-label-2 mt-8 max-w-prose text-pretty">
              {copy.home.nothingToSay}
            </p>
          )}
        </>
      )}
    </div>
  );
}
