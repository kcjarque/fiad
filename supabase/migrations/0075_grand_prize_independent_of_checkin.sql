-- Separate grand-prize eligibility from same-day check-in.
--
-- The event runs over multiple days and checked_in_at is a single scalar, so a
-- guest who came on Day 1 stays "checked in" forever and keeps winning hourly
-- prizes after they have gone home. The intended fix is to clear stale
-- check-ins each morning and have the desk re-scan returning guests, which
-- makes "checked in" mean "here today".
--
-- That fix would destroy the grand prize under the 0060 rules, because the
-- grand branch ALSO requires checked_in_at. Right now the entire grand pool is
-- 3 Brittany guests holding 11 paid entries, and all three checked in on Day 1
-- only — clearing stale check-ins would empty the pool completely.
--
-- So the two rules are split, matching how the event actually works:
--
--   hourly → must be checked in. Combined with the daily clear this means
--            "present today", which is the point: you must be in the room to
--            claim an hourly prize.
--
--   grand  → PAID entries only, pooled across pool_event_ids, and NO check-in
--            requirement. A paid entry can only be earned by transacting at a
--            booth, so it is itself evidence of attendance — and it must
--            survive the day it was earned, since Brittany closes before
--            Sunday's grand draw at Mella. Complimentary entries remain
--            excluded, so simply registering still buys nothing.
--
-- Everything else is unchanged from 0064: grand keeps its no-past-winner
-- allowance, hourly keeps the no-double-winner exclusion, and both stay scoped
-- as before.

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

  v_is_grand := coalesce(v_prize.is_grand, false) or p_prize_id = 'prize_grand';
  v_pool     := coalesce(nullif(v_prize.pool_event_ids, '{}'), array[v_prize.event_id]);

  if v_is_grand then
    -- Paid entries across the pooled venues. No check-in test: a paid entry
    -- already implies attendance, and it has to outlive the day it was earned.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.event_id = any(v_pool)
       and e.is_complimentary = false
     order by random() limit 1;
  else
    -- Hourly: this event only, guest must be checked in, and exclude tickets
    -- that already won here.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
      join guests g on g.id = e.guest_id
     where e.event_id = v_prize.event_id
       and g.checked_in_at is not null
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
