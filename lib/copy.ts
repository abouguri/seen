import { APP_NAME } from "@/lib/constants";

/**
 * Every user-facing string lives here (§02: English-only in v1, but
 * centralised so localisation later is a config change, not a rewrite).
 * Voice rules (§7.6): sentence case, no exclamation marks, no emoji.
 * Errors say what happened and what to do; empty states invite action.
 */
export const copy = {
  home: {
    eyebrow: "From your archive",
    title: "What to watch next",
    // The page's claim, stated once at the top: these come from what
    // you finished, and every one of them shows its working.
    subtitle:
      "Drawn from the films you've actually finished — every suggestion below says why it's here.",
    learning: (count: number) =>
      `Still learning your taste — ${count} ${count === 1 ? "film" : "films"} in. Log a few more and the director and decade shelves turn on.`,
    emptyBody:
      "Recommendations come from the films you've already logged, so there's nothing honest to suggest yet.",
    emptyCta: "Add your first film",
    emptyHint: "Add five films and this page turns on.",
    nothingToSay:
      "Nothing new to suggest right now. Log a few more films — or check back once the archive has grown.",
  },

  signIn: {
    // The page's argument, not a greeting. The sub-line is the one that
    // has to survive edits: it defines the product against every other
    // film app in a sentence, which is the whole reason a stranger
    // should read past the headline.
    headline: "You've seen more than you remember.",
    sub: `${APP_NAME} is a private record of the films you've watched — not a queue of things you haven't.`,
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    submit: "Send magic link",
    sending: "Sending link…",
    sentPrefix: "Check your email — we sent a sign-in link to",
    sentHint: "The link works once and expires in an hour.",
    resend: "Use a different email",
    errorCallback: "That link didn't work — it may have expired or already been used. Request a new one below.",
    // One message per thing that can actually go wrong, each naming the
    // cause and the next move. There is deliberately no generic
    // fallback-shaped copy here: errorUnknown still says what to do.
    //
    // Note there is no "wrong credentials" state. This is magic-link
    // auth — there is no password to get wrong. The nearest real failure
    // is an address the provider won't accept, which is errorEmail.
    errorEmail: "That email address wasn't accepted. Check it for typos and try again.",
    errorRateLimited: "Too many links requested. Wait about a minute, then try again.",
    errorOffline: "Couldn't reach the server. Check your connection and try again.",
    errorServer: `${APP_NAME} couldn't send the link just now. Try again in a moment.`,
  },
  nav: {
    home: "For you",
    library: "Library",
    add: "Add",
    search: "Search",
    stats: "Stats",
  },
  library: {
    title: "Library",
    /* The display headline is two lines by design — the second one takes
       the lilac, so it's kept separate rather than split at render. */
    headlineLead: "Everything you've",
    headlineAccent: "already seen.",
    searchAffordance: "Search your archive",
    addAction: "Add titles",
    /* Empty states are a card with a heading and a line of body, so the
       single sentence each used to be is split in two. */
    emptyTitle: "Your archive starts here.",
    emptyMessage:
      "Add the films and shows you remember. Exact dates are optional — memory is allowed to be fuzzy.",
    noResultsTitle: "Nothing matches.",
    noResultsForFilter: "No titles match these filters. Clear one and try again.",
    sortLabel: "Sort",
    sort: {
      recent_added: "Recently added",
      recent_watched: "Recently watched",
      release_year: "Release year",
      rating: "Rating",
      title: "A–Z",
    },
    filterLabel: "Filter",
    filter: {
      typeFieldLabel: "Type",
      allTypes: "All",
      movies: "Movies",
      shows: "Shows",
      decade: "Decade",
      genre: "Genre",
      director: "Director",
      ratingFieldLabel: "Rating",
      rated: "Rated",
      unrated: "Unrated",
      allDecades: "All decades",
      allGenres: "All genres",
      allDirectors: "All directors",
      allRatings: "All",
      tag: "Tag",
      allTags: "All tags",
      clear: "Clear filters",
    },
    contextMenu: {
      logAnother: "Log another viewing",
      edit: "Edit",
      remove: "Remove from library",
    },
    removeConfirmTitle: (title: string, count: number) =>
      `Remove ${title} and its ${count} viewing${count === 1 ? "" : "s"}?`,
    removeConfirmBody: "This can't be undone.",
    removeAction: "Remove",
    cancelAction: "Cancel",
  },
  account: {
    signOut: "Sign out",
  },
  errors: {
    signInRequired: "Sign in to search the film database.",
    rateLimited: "Too many searches at once. Wait a moment and try again.",
    tmdbUnreachable: "Couldn't reach the film database. Check your connection and try again.",
    invalidQuery: "Type a title to search.",
    filmNotFound: "Couldn't find that film.",
    showNotFound: "Couldn't find that show.",
    entrySaveFailed: "Couldn't save that viewing. Check your connection and try again.",
    libraryLoadFailed: "Couldn't load your library. Check your connection and try again.",
    importFailed: "Couldn't process that import. Check your connection and try again.",
    exportFailed: "Couldn't export your library. Check your connection and try again.",
    retry: "Try again",
  },
  search: {
    title: "Search",
    placeholder: "Search films",
    emptyPromptTitle: "Have you seen it?",
    emptyPrompt: "Search for a film or show to find out whether it's already in your archive.",
    noResultsTitle: "Nothing found.",
    noResults: "No results for",
    seenLabel: "Seen",
    /* The redesign splits results into what you've already logged and
       everything else, rather than one relevance-ordered list. */
    inArchive: "In your archive",
    elsewhere: "Elsewhere",
    logIt: "Log it",
  },
  add: {
    eyebrow: "Poster wall",
    headlineLead: "Colour in what you",
    headlineAccent: "remember.",
  },
  film: {
    logAnother: "Log another",
    yourHistory: "Your viewing history",
    /* The detail panel's three figures. */
    statSeen: "Seen",
    statRating: "Your rating",
    statLastSeen: "Last seen",
    synopsis: "Synopsis",
    noHistoryYet: "You haven't logged a viewing yet.",
    editViewing: "Edit viewing",
    deleteViewing: "Delete viewing",
    deleteViewingConfirm: "Delete this viewing? This can't be undone.",
  },
  logViewing: {
    title: "Log a viewing",
    editTitle: "Edit viewing",
    saveChanges: "Save changes",
    whenLabel: "When",
    whenToday: "Today",
    whenPickDate: "Pick a date",
    whenYear: "Just the year",
    whenRoughly: "Roughly",
    whenUnknown: "Don't remember",
    dateLabel: "Date",
    yearLabel: "Year",
    eraLabel: "What was going on?",
    eraPlaceholder: "as a kid",
    eraSuggestions: ["as a kid", "at university", "during lockdown"],
    /* "More" is gone with the disclosure it opened — Where and Who with
       are always visible now, because the summary sentence names them. */
    ratingLabel: "Rating",
    unrated: "Not rated",
    noteLabel: "What do you remember?",
    notePlaceholder: "The library scene. The rain on the sleeve at the end.",
    /* The summary sentence at the top of the form. Each phrase is
       written to slot into "I watched it ___, ___, ___." — so they read
       as adverbials, not as field values. */
    sentenceLead: "I watched it",
    phraseToday: "today",
    phraseNoDate: "on a date",
    phraseInYear: "in",
    phraseRoughly: "roughly",
    phraseUnknown: "at some point",
    placeLabel: "Where",
    placePlaceholder: "cinema, on a plane",
    companyLabel: "Who with",
    companyPlaceholder: "with my brother",
    tagsLabel: "Tags",
    tagsPlaceholder: "Add a tag and press enter",
    removeTag: "Remove tag",
    submit: "Log a viewing",
    saving: "Saving…",
    close: "Close",
  },
  wall: {
    done: "Done",
    noResultsTitle: "Nothing for this year.",
    noResults: "Try a nearby year, or switch between movies and shows.",
    /* The floating bar sets the number in display type on its own, so
       the words beside it can't repeat it. */
    addedLabel: "added to your archive",
    offline: "Offline — changes will sync",
  },
  stats: {
    title: "Stats",
    emptyTitle: "No numbers yet.",
    emptyMessage: "Log a few viewings and this fills in on its own.",
    filmsPerYear: "Titles per year",
    decadesWatched: "Decades watched",
    mostSeenDirectors: "Most-seen directors",
    totalHours: "Total hours watched",
    longestGap: "Longest gap between rewatches",
    firstLogged: "First title logged",
    lastLogged: "Most recent title logged",
    daysSuffix: (n: number) => `${n} day${n === 1 ? "" : "s"} apart`,
    loadFailed: "Couldn't load your stats. Check your connection and try again.",
  },
  settings: {
    title: "Settings",
    accountSection: "Account",
    signedInAs: "Signed in as",
    appearanceSection: "Appearance",
    appearanceSystem: "System",
    appearanceLight: "Light",
    appearanceDark: "Dark",
    importSection: "Import",
    importDescription: "Bring in your history from Letterboxd or IMDb.",
    exportSection: "Export",
    exportDescription: "Download a full copy of your library — for backup, or to move elsewhere.",
    exportJson: "Export as JSON",
    exportCsv: "Export as CSV",
    dangerSection: "Danger zone",
    deleteAccount: "Delete account",
    deleteAccountConfirmTitle: "Delete your account?",
    deleteAccountConfirmBody: "Every film, viewing, and note is deleted permanently. This can't be undone.",
    deleteAccountAction: "Delete account",
    aboutSection: "About",
    tmdbAttribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  },
  import: {
    title: "Import",
    chooseFile: "Choose a file",
    dropHint:
      "A Letterboxd diary.csv or watched.csv, an IMDb ratings export, or a SEEN export. diary.csv also brings your ratings.",
    parsing: "Reading file…",
    unrecognisedFormat:
      "Couldn't recognise that file. Export a Letterboxd watched.csv, an IMDb ratings export, or a SEEN export, and try again.",
    matching: "Matching",
    matchBatchFailed: "Couldn't match that batch. Check your connection and try again.",
    retryBatch: "Retry",
    reviewTitle: "Review import",
    matchedLabel: "Matched",
    ambiguousLabel: "Needs a pick",
    unmatchedLabel: "Not found",
    skip: "Skip",
    skipped: "Skipped",
    pick: "Pick",
    confirmImport: "Import",
    importing: "Importing…",
    commitFailed: "Couldn't finish the import. Check your connection and try again — nothing already imported was lost.",
    nothingToImport: "Nothing to import.",
  },
} as const;
