import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { LeadRecommendation } from "@/components/home/LeadRecommendation";
import { RecommendationShelf } from "@/components/home/RecommendationShelf";
import { OnThisDay } from "@/components/home/OnThisDay";
import { RewatchRoulette } from "@/components/home/RewatchRoulette";
import { loadArchive } from "@/lib/recommendations/archive";
import { buildRecommendations, FOUR_STARS, THIN_ARCHIVE } from "@/lib/recommendations/engine";
import { getOnThisDayEntries } from "@/lib/on-this-day";
import { createClient } from "@/lib/supabase/server";
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
 *
 * Layout is a band and then a list. The band carries the sign-in page's
 * composition — a ledger grid, two washes, a veil — because this is the
 * other screen that opens with an argument rather than with content, and
 * it holds the headline and the one film being argued for. It stops
 * there. Below it the shelves run on plain ground: six posters across is
 * already the densest thing on the screen, and a 112px frame grid behind
 * a poster grid is a moiré rather than a texture.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware redirects; nothing to render.

  const [archive, onThisDayEntries] = await Promise.all([
    loadArchive(),
    getOnThisDayEntries(supabase, user.id),
  ]);
  if (!archive) return null;

  const { libraryCount, lead, shelves } = await buildRecommendations(archive);

  const rouletteCandidates = archive.films
    .filter((film) => film.rating !== null && film.rating >= FOUR_STARS)
    .map((film) => ({
      id: film.id,
      title: film.title,
      year: film.year,
      posterPath: film.posterPath,
      rating: film.rating!,
    }));

  const intro =
    libraryCount === 0
      ? copy.home.emptyBody
      : libraryCount < THIN_ARCHIVE
        ? /* Says how thin the archive is rather than quietly showing
             less. The number is the honest part — "still learning" on
             its own would read as a stall. */
          copy.home.learning(libraryCount)
        : copy.home.subtitle;

  return (
    <div className="pb-20">
      <div className="relative isolate">
        {/* The band's ground, back to front: ruled grid, two washes, and
            a veil that clears the type on the left and dissolves the
            whole thing into the page at the bottom. The shell's grain
            (PatternBackdrop) already runs underneath all of it, so
            there's no grain layer here. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(var(--ledger)_1px,transparent_1px),linear-gradient(90deg,var(--ledger)_1px,transparent_1px)] bg-position-[100%_0] bg-size-[112px_152px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_108%_-30%,color-mix(in_srgb,var(--wash-cool)_var(--wash-alpha),transparent)_0_28%,transparent_56%),radial-gradient(ellipse_at_82%_130%,color-mix(in_srgb,var(--warm)_var(--wash-alpha),transparent)_0_26%,transparent_52%)] bg-size-[100%_100%] bg-no-repeat"
        />
        <div aria-hidden="true" className="home-veil pointer-events-none absolute inset-0 -z-10" />

        <div className="mx-auto w-full max-w-350 px-4 pt-9 pb-10 md:px-9 md:pt-12">
          <header>
            <p className="text-eyebrow text-label-3">{copy.home.eyebrow}</p>
            <h1 className="text-display-1 mt-3.5 text-balance">
              {copy.home.headlineLead}{" "}
              <span className="text-accent-text">{copy.home.headlineAccent}</span>
            </h1>
            <p className="text-body text-label-2 mt-5 max-w-[46ch] leading-6 text-pretty">
              {intro}
            </p>

            {rouletteCandidates.length > 0 && (
              <div className="mt-6">
                <RewatchRoulette candidates={rouletteCandidates} />
              </div>
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
            lead && (
              <div className="mt-9">
                <LeadRecommendation film={lead} />
              </div>
            )
          )}
        </div>
      </div>

      <OnThisDay entries={onThisDayEntries} />

      {libraryCount > 0 && (
        <div className="mx-auto w-full max-w-350 px-4 md:px-9">
          {shelves.map((shelf) => (
            <RecommendationShelf key={`${shelf.kind}-${shelf.title}`} shelf={shelf} />
          ))}

          {/* The archive has films but nothing true could be said about
              them — every TMDB-backed section came back empty, or the
              user has dismissed their way through the candidates. Better
              than a page of placeholders. */}
          {!lead && shelves.length === 0 && (
            <p className="text-body text-label-2 max-w-prose text-pretty">
              {copy.home.nothingToSay}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
