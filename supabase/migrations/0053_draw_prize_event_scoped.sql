-- Event-scope the raffle draw (multi-tenant fix).
--
-- The read side (raffleService) is event-scoped, but draw_prize selected
-- winners from raffle_entries across ALL events, and excluded already-won
-- tickets using prizes across ALL events. With Season 2 RSVPs now creating
-- complimentary entries in their own events, an unscoped draw could pick a
-- Season-2 lead (not at the venue) as a Season-1 winner. Scope every read in
-- the draw to the prize's own event (prizes.event_id).
--
-- Preserves 0048 behavior: grand = paid-only, no past-winner exclusion;
-- hourly = whole pool, exclude already-won tickets.

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
    -- Grand prize: PAID entries only, NO past-winner exclusion — scoped to this event.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.event_id = v_prize.event_id
       and e.is_complimentary = false
     order by random() limit 1;
  else
    -- Hourly prizes: whole pool for this event, exclude tickets that already won in this event.
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
