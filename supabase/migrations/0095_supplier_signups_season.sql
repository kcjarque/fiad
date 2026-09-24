-- Tag supplier applications with the season they are applying for, and open
-- the Season 3 intake.
--
-- supplier_signups has carried no season or event since it was created, so
-- every application since the form went live sat in one undated pool. That is
-- why it is the only dataset the export's venue filter cannot segment, and why
-- a Season 3 intake would otherwise be indistinguishable from Season 2's.
--
-- A season LABEL rather than an event_id, deliberately: Season 3's venues and
-- dates are not decided, so there is no event row to point at. A text season
-- can be assigned now and an event attached later without rewriting the
-- applications collected in between.
--
-- Backfill: all 203 existing rows are Season 2. Verified, not assumed -- the
-- earliest is 2026-07-09 and the latest 2026-09-15, so every one falls after
-- Season 1's fair (Jun 6-7) and on or before Season 2's (Sep 18-20). No row is
-- ambiguous, so no date-boundary guesswork is needed.
--
-- The default is what makes this the Season 3 intake: an insert that does not
-- name a season now lands in Season 3 rather than being silently untagged.
-- The app also passes it explicitly, from CURRENT_INTAKE_SEASON, so the value
-- is visible in the code rather than only in the schema.

alter table supplier_signups add column if not exists season text;

update supplier_signups set season = 'Season 2' where season is null;

alter table supplier_signups alter column season set default 'Season 3';
alter table supplier_signups alter column season set not null;

create index if not exists supplier_signups_season_idx on supplier_signups (season, created_at desc);
