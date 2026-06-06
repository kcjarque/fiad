-- ────────────────────────────────────────────────────────────────────────
-- "Raffle awards — entry for all registrants, except for the GRAND PRIZE"
-- ────────────────────────────────────────────────────────────────────────
-- Every registered guest gets one complimentary raffle entry on signup.
-- Those entries are eligible for the hourly draws but NOT the grand prize
-- (Romierre 14K Gold Wedding Ring) — the grand prize stays reserved for
-- entries earned through real transactions.

-- 1) Make transaction_id nullable so a complimentary entry doesn't need a
--    fake transaction.
alter table raffle_entries alter column transaction_id drop not null;

-- 2) Flag column to identify complimentary entries (so the grand-prize
--    pool query can exclude them).
alter table raffle_entries
  add column if not exists is_complimentary boolean not null default false;

create index if not exists raffle_entries_complimentary_idx
  on raffle_entries (is_complimentary)
  where is_complimentary = true;

-- 3) Trigger: every new guest gets exactly one complimentary entry.
--    Runs AFTER INSERT on guests. The retry loop handles the (extremely
--    unlikely) ticket-number collision on the unique constraint.
create or replace function create_complimentary_raffle_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket   text;
  v_attempts int := 0;
begin
  loop
    v_ticket := 'FIAD-COMP-' || lpad(((floor(random() * 90000))::int + 10000)::text, 5, '0');
    begin
      insert into raffle_entries (id, event_id, guest_id, transaction_id, ticket_number, is_complimentary)
      values (
        'rt_comp_' || replace(gen_random_uuid()::text, '-', ''),
        new.event_id,
        new.id,
        null,
        v_ticket,
        true
      );
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 20 then
        raise exception 'Could not generate a unique complimentary ticket after 20 attempts';
      end if;
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists guests_create_complimentary_entry on guests;
create trigger guests_create_complimentary_entry
  after insert on guests
  for each row
  execute function create_complimentary_raffle_entry();

-- 4) Backfill: issue a complimentary entry to every existing guest who
--    doesn't already have one. Idempotent — re-running just no-ops.
insert into raffle_entries (id, event_id, guest_id, transaction_id, ticket_number, is_complimentary)
select
  'rt_comp_' || replace(gen_random_uuid()::text, '-', ''),
  'evt_fiad_dec25',
  g.id,
  null,
  'FIAD-COMP-' || lpad(((floor(random() * 90000))::int + 10000)::text, 5, '0'),
  true
from guests g
where not exists (
  select 1 from raffle_entries r
  where r.guest_id = g.id and r.is_complimentary = true
);

-- 5) Update draw_prize so the grand prize draws from earned entries ONLY,
--    while every other prize keeps drawing from the full pool.
create or replace function draw_prize(p_prize_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize         prizes;
  v_winner_guest  text;
  v_winner_ticket text;
  v_winner_name   text;
begin
  select * into v_prize from prizes where id = p_prize_id for update;
  if not found then return null; end if;

  if v_prize.winner_guest_id is not null and v_prize.winning_ticket_number is not null then
    select name into v_winner_name from guests where id = v_prize.winner_guest_id;
    return jsonb_build_object(
      'prize_id', p_prize_id,
      'winner_guest_id', v_prize.winner_guest_id,
      'winner_name', coalesce(v_winner_name, 'Guest'),
      'ticket_number', v_prize.winning_ticket_number
    );
  end if;

  if p_prize_id = 'prize_grand' then
    -- Grand prize — earned entries only (no complimentary).
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.is_complimentary = false
       and e.ticket_number not in (
         select winning_ticket_number from prizes
          where winning_ticket_number is not null
       )
     order by random() limit 1;
  else
    -- Every other prize — full pool, includes complimentary.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.ticket_number not in (
         select winning_ticket_number from prizes
          where winning_ticket_number is not null
       )
     order by random() limit 1;
  end if;

  if v_winner_ticket is null then return null; end if;

  update prizes
     set winner_guest_id = v_winner_guest,
         winning_ticket_number = v_winner_ticket,
         drawn_at = now()
   where id = p_prize_id;

  select name into v_winner_name from guests where id = v_winner_guest;
  return jsonb_build_object(
    'prize_id', p_prize_id,
    'winner_guest_id', v_winner_guest,
    'winner_name', coalesce(v_winner_name, 'Guest'),
    'ticket_number', v_winner_ticket
  );
end;
$$;

grant execute on function draw_prize(text) to anon;
