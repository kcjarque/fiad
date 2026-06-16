-- Ads funnel (FIAD Season 2 RSVP): record which day a registrant plans to
-- attend (Day 1 / Day 2). Nullable + additive, so existing Season 1 guests
-- are unaffected and the live event is untouched.
--
-- Run in the dashboard SQL editor:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new
alter table guests add column if not exists preferred_day text;
