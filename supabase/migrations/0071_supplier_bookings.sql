-- Evergreen supplier bookings: a client can request a booking / inquiry with a
-- supplier straight from that supplier's calling card, and it keeps working
-- after the fair ends (the card link never expires). Suppliers see their own
-- requests in the store portal; admins see all.
create table if not exists supplier_bookings (
  id           text primary key,
  store_id     text not null references stores(id) on delete cascade,
  event_id     text,
  client_name  text not null,
  client_mobile text,
  client_email text,
  event_date   text,
  message      text,
  status       text not null default 'new',   -- new | contacted | closed
  created_at   timestamptz not null default now()
);

alter table supplier_bookings enable row level security;

-- The app runs entirely on the anon key (store + admin auth are passcode-based,
-- not Supabase Auth), so the public form (insert), the portal/admin lists
-- (select) and status changes (update) all go through anon. No anon delete.
drop policy if exists sb_anon_insert on supplier_bookings;
create policy sb_anon_insert on supplier_bookings for insert to anon with check (true);
drop policy if exists sb_anon_select on supplier_bookings;
create policy sb_anon_select on supplier_bookings for select to anon using (true);
drop policy if exists sb_anon_update on supplier_bookings;
create policy sb_anon_update on supplier_bookings for update to anon using (true) with check (true);

create index if not exists supplier_bookings_store_idx on supplier_bookings(store_id, created_at desc);
