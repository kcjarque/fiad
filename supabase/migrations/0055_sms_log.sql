-- SMS send log — the source of truth behind the "Text Messages" cost counter
-- in Event Settings. The `notify` edge function inserts one row per SMS it
-- sends (guest RSVP confirmation + admin inquiry alert), recording how many
-- billable 160-char segments it cost. The admin reads these to total spend.
--
-- DDL requires dashboard SQL (anon can't run DDL). Paste this whole file at:
--   https://supabase.com/dashboard/project/cjhnsyldnzdedgianzsj/sql/new

create table if not exists sms_log (
  id          text primary key,
  event_id    text references events(id) on delete set null,
  kind        text not null,                       -- 'rsvp_confirmation' | 'inquiry_lead'
  to_phone    text not null,
  segments    int  not null default 1,             -- billable 160-char parts
  status      text not null,                       -- 'sent' | 'failed'
  created_at  timestamptz not null default now()
);

create index if not exists sms_log_status_idx on sms_log (status);

alter table sms_log enable row level security;

-- Admin console reads them (admin auth is enforced app-side; the anon role is
-- what the browser uses for all reads). Inserts come only from the edge
-- function via the service-role key, which bypasses RLS — so there is no
-- anon INSERT policy on purpose (the public can't forge usage rows).
drop policy if exists "anon_select_sms_log" on sms_log;
create policy "anon_select_sms_log" on sms_log
  for select to anon using (true);
