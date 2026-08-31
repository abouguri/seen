-- Every film enriched before the previous migration added cast_members
-- has enriched_at already set (a full detail fetch happened) but no cast
-- data (the column didn't exist to write it into) — getFilmDetail's
-- "cached and fully enriched" fast path would otherwise serve that empty
-- cast forever, since nothing else signals "this row predates cast
-- support". Resetting enriched_at costs each film exactly one redundant
-- re-fetch (the next time it's viewed, or the next enrichment cron run) —
-- self-correcting, and safe even for a film with a genuinely empty cast
-- (it just re-confirms that once, not forever, since enriched_at is set
-- again the moment the re-fetch completes).
update public.films
set enriched_at = null;
