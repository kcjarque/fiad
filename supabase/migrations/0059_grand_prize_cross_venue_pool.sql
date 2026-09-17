-- Cross-venue grand prize pooling.
--
-- Season 2 runs as two separate events (Brittany BGC, Mella Las Piñas) so each
-- venue gets its own registrant list. 0053 then scoped every read in
-- draw_prize to the prize's own event, which is correct for hourly draws but
-- wrong for the grand raffle: the grand draw is held live at Mella, yet BOTH
-- venues' participants are meant to be in the pool.
--
-- This splits a prize's *home* from its *pool*:
--   event_id       — where the prize is hosted / drawn / listed (unchanged)
--   pool_event_ids — which events' entries are eligible
--
-- It also replaces the hardcoded `id = 'prize_grand'` test with a real
-- is_grand flag. Prizes created through the admin UI get a random id
-- (uid('prize') → 'prize_ab12cd34'), so a newly-added grand prize never
-- matched that literal and silently fell through to the HOURLY branch —
-- drawing from complimentary RSVP entries instead of paid-only.

-- 1) Columns.
alter table prizes
  add column if not exists is_grand       boolean not null default false;
alter table prizes
  add column if not exists pool_event_ids text[];

-- 2) Backfill: existing prizes pool only their own event (current behavior).
update prizes
   set pool_event_ids = array[event_id]
 where pool_event_ids is null;

-- 3) The Season-1 grand prize keeps grand semantics under the new flag.
update prizes set is_grand = true where id = 'prize_grand';

-- 4) Keep pool_event_ids populated no matter which path inserts the row —
--    the admin UI, a seed migration, or the dashboard SQL editor. Without
--    this, a hand-written insert would leave a null pool and the draw would
--    fall back to the prize's own event.
create or replace function prizes_default_pool()
returns trigger
language plpgsql
as $$
begin
  if new.pool_event_ids is null or cardinality(new.pool_event_ids) = 0 then
    new.pool_event_ids := array[new.event_id];
  end if;
  -- A prize is always eligible to its own host event.
  if not (new.event_id = any(new.pool_event_ids)) then
    new.pool_event_ids := new.pool_event_ids || new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists prizes_default_pool_trg on prizes;
create trigger prizes_default_pool_trg
  before insert or update of event_id, pool_event_ids on prizes
  for each row execute function prizes_default_pool();

create index if not exists prizes_pool_event_ids_idx on prizes using gin (pool_event_ids);

-- 5) Draw, now pool-aware.
--
-- Preserves 0048/0049 semantics:
--   grand  → paid entries only, NO past-winner exclusion, pooled across
--            pool_event_ids.
--   hourly → whole pool of the prize's own event, excluding tickets that
--            already won in that event.
--
-- Safe to pool because raffle_entries.ticket_number is globally unique
-- (`text not null unique` in 0001), not per-event — no collisions across
-- venues.
create or replace function draw_prize(p_prize_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize         prizes;
  v_pool          text[];
  v_is_grand      boolean;
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

  -- 'prize_grand' stays recognized so a re-seeded Season-1 row behaves
  -- correctly even if step 3 hasn't run against that database.
  v_is_grand := coalesce(v_prize.is_grand, false) or p_prize_id = 'prize_grand';
  v_pool     := coalesce(nullif(v_prize.pool_event_ids, '{}'), array[v_prize.event_id]);

  if v_is_grand then
    -- Grand: PAID entries only, no past-winner exclusion, pooled across venues.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.event_id = any(v_pool)
       and e.is_complimentary = false
     order by random() limit 1;
  else
    -- Hourly: this event only, exclude tickets that already won here.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.event_id = v_prize.event_id
       and e.ticket_number not in (
         select winning_ticket_number from prizes
          where event_id = v_prize.event_id
            and winning_ticket_number is not null
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
