-- Films that already went through a full detail fetch before enriched_at
-- existed (this session's earlier milestones) would otherwise sit in the
-- enrichment queue for one redundant re-fetch each, purely because the
-- column didn't exist yet when they were enriched. Backfill from the
-- data that's already the evidence they were fetched: runtime is never
-- set except by a full detail fetch (see upsertFilmDetail).
update public.films
set enriched_at = synced_at
where runtime is not null
  and enriched_at is null;
