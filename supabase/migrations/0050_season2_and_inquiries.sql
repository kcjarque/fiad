-- Season 2 multi-tenant rollout.
--   1. Add the Season 2 event row so the admin event switcher has something
--      to switch to and the public Season 2 registration page has a home.
--   2. Add event_inquiries — the lead-capture table behind the Season 2
--      thank-you page's "Need help organizing your event?" form.
--
-- DDL/INSERT here require dashboard SQL (anon has no INSERT on events and
-- can't run DDL). Paste this whole file at:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new

-- 1. Season 2 event row. Status 'draft' (not 'live') so it stays clearly
--    separate from the live Season 1 event. Date is after Season 1 so the
--    "newest event" fallback still resolves sensibly. raffle_rate / cap
--    mirror Season 1 defaults; the admin can edit these in the Event tab
--    once Season 2 is selected.
insert into events (id, name, date, venue, raffle_rate, daily_cap_per_guest_per_store, status)
values (
  'evt_fiad_season2',
  'FIAD Season 2',
  '2026-12-05',
  'TBA',
  100,
  5000,
  'draft'
)
on conflict (id) do nothing;

-- 2. Event inquiries (sales leads from the Season 2 thank-you page).
create table if not exists event_inquiries (
  id          text primary key,
  event_id    text references events(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text not null,
  event_type  text,
  message     text,
  created_at  timestamptz not null default now()
);

alter table event_inquiries enable row level security;

-- Public form → anyone may submit an inquiry.
drop policy if exists "anon_insert_event_inquiries" on event_inquiries;
create policy "anon_insert_event_inquiries" on event_inquiries
  for insert to anon with check (true);

-- Admin console reads them (admin auth is enforced app-side; the anon
-- role is what the browser uses for all reads).
drop policy if exists "anon_select_event_inquiries" on event_inquiries;
create policy "anon_select_event_inquiries" on event_inquiries
  for select to anon using (true);
