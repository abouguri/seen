-- M3: the poster wall's tap-to-toggle is a binary "have I seen this at
-- all" marker, not a rewatch log — unlike manual entries (§9: duplicate
-- log allowed), at most one poster_wall-sourced row should ever exist
-- per (user, film). The bulk entries route pre-checks for an existing
-- row before inserting, so this constraint is a defense-in-depth
-- backstop against races (e.g. two flush batches overlapping), not the
-- primary de-dup mechanism.
create unique index watch_entries_poster_wall_unique
  on public.watch_entries (user_id, film_id)
  where source = 'poster_wall';
