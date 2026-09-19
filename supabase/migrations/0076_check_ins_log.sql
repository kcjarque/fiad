-- Append-only check-in log, so attendance survives the daily reset.
--
-- guests.checked_in_at is a single scalar: it answers "is this guest checked
-- in" but not "who was here on Day 1". The multi-day fix clears it each
-- morning so the desk re-scans returners — which would erase the attendance
-- record entirely, taking the audit trail and every per-day analytic with it.
--
-- This records each check-in as its own row, so clearing the scalar is safe:
-- checked_in_at becomes "present today", check_ins remains "everyone who ever
-- attended, and when".
--
-- Writes happen through a trigger rather than the app, so every path is
-- covered — the door scanner, the manual search, and any correction made
-- straight from the dashboard. The trigger is SECURITY DEFINER so the log can
-- stay closed to anon while still capturing check-ins performed with the
-- public key.

create table if not exists check_ins (
  id            text primary key,
  guest_id      text not null references guests(id) on delete cascade,
  event_id      text not null references events(id) on delete cascade,
  checked_in_at timestamptz not null default now()
);

create index if not exists check_ins_guest_idx on check_ins (guest_id);
create index if not exists check_ins_event_day_idx
  on check_ins (event_id, ((checked_in_at at time zone 'Asia/Manila')::date));

-- Backfill from the current scalar BEFORE anything clears it. Every guest
-- presently marked checked in becomes one historical row.
insert into check_ins (id, guest_id, event_id, checked_in_at)
select
  'ci_backfill_' || substr(md5(g.id || g.checked_in_at::text), 1, 20),
  g.id,
  g.event_id,
  g.checked_in_at
from guests g
where g.checked_in_at is not null
on conflict (id) do nothing;

-- Log every future check-in. Fires only when checked_in_at moves to a real
-- value, so the daily clear (setting it to null) records nothing.
create or replace function log_check_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.checked_in_at is not null
     and (tg_op = 'INSERT' or old.checked_in_at is distinct from new.checked_in_at)
  then
    insert into check_ins (id, guest_id, event_id, checked_in_at)
    values (
      'ci_' || replace(gen_random_uuid()::text, '-', ''),
      new.id, new.event_id, new.checked_in_at
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists log_check_in_trg on guests;
create trigger log_check_in_trg
  after insert or update of checked_in_at on guests
  for each row execute function log_check_in();

-- Readable for admin analytics; writes come only from the trigger, so the log
-- cannot be edited or erased with the public key the way guests.checked_in_at
-- can.
grant select on check_ins to anon;
