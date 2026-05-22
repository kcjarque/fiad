-- Enable Row Level Security on all tables.
-- The app uses the Supabase anon key for all client requests, so we grant the
-- anon role the minimum operations each table needs. DELETE is intentionally
-- withheld from the anon role on every table — deletions must go through the
-- Supabase dashboard or a trusted server context.

-- ─── Enable RLS ───────────────────────────────────────────────────────────────
alter table events               enable row level security;
alter table admins               enable row level security;
alter table stores               enable row level security;
alter table guests               enable row level security;
alter table transactions         enable row level security;
alter table raffle_entries       enable row level security;
alter table prizes               enable row level security;
alter table passport_stamps      enable row level security;
alter table challenges           enable row level security;
alter table challenge_completions enable row level security;
alter table walkthrough_items    enable row level security;
alter table override_requests    enable row level security;

-- ─── events (read-only for anon) ──────────────────────────────────────────────
create policy "anon_select_events" on events
  for select to anon using (true);

-- ─── admins (read-only — app checks passcode client-side) ─────────────────────
create policy "anon_select_admins" on admins
  for select to anon using (true);

-- ─── stores (read-only for anon; admin manages via dashboard) ─────────────────
create policy "anon_select_stores" on stores
  for select to anon using (true);

-- ─── guests ───────────────────────────────────────────────────────────────────
create policy "anon_select_guests" on guests
  for select to anon using (true);

create policy "anon_insert_guests" on guests
  for insert to anon with check (true);

create policy "anon_update_guests" on guests
  for update to anon using (true) with check (true);

-- ─── transactions ─────────────────────────────────────────────────────────────
create policy "anon_select_transactions" on transactions
  for select to anon using (true);

create policy "anon_insert_transactions" on transactions
  for insert to anon with check (true);

-- ─── raffle_entries ───────────────────────────────────────────────────────────
create policy "anon_select_raffle_entries" on raffle_entries
  for select to anon using (true);

create policy "anon_insert_raffle_entries" on raffle_entries
  for insert to anon with check (true);

-- ─── prizes ───────────────────────────────────────────────────────────────────
create policy "anon_select_prizes" on prizes
  for select to anon using (true);

-- UPDATE needed so the admin draw can record the winner.
create policy "anon_update_prizes" on prizes
  for update to anon using (true) with check (true);

-- ─── passport_stamps ──────────────────────────────────────────────────────────
create policy "anon_select_passport_stamps" on passport_stamps
  for select to anon using (true);

create policy "anon_insert_passport_stamps" on passport_stamps
  for insert to anon with check (true);

-- ─── challenges ───────────────────────────────────────────────────────────────
create policy "anon_select_challenges" on challenges
  for select to anon using (true);

-- ─── challenge_completions ────────────────────────────────────────────────────
create policy "anon_select_challenge_completions" on challenge_completions
  for select to anon using (true);

create policy "anon_insert_challenge_completions" on challenge_completions
  for insert to anon with check (true);

-- ─── walkthrough_items ────────────────────────────────────────────────────────
create policy "anon_select_walkthrough_items" on walkthrough_items
  for select to anon using (true);

-- ─── override_requests ────────────────────────────────────────────────────────
create policy "anon_select_override_requests" on override_requests
  for select to anon using (true);

create policy "anon_insert_override_requests" on override_requests
  for insert to anon with check (true);

-- UPDATE needed so admins can approve / deny requests.
create policy "anon_update_override_requests" on override_requests
  for update to anon using (true) with check (true);
