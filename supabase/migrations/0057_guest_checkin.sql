-- Admin door check-in: stamp when a guest is scanned in at the entrance.
-- Anon already has UPDATE on guests (see updateGuestName), so the check-in
-- writes this column directly — no RPC needed.
alter table guests add column if not exists checked_in_at timestamptz;
create index if not exists guests_checked_in_idx on guests (event_id, checked_in_at);
