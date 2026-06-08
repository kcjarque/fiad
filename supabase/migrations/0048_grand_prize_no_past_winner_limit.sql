-- Remove the past-winner limitation from the grand prize draw.
--
-- Previously draw_prize excluded any ticket that had already won another
-- prize, for ALL prizes including the grand. Per organizer request, the
-- grand prize should draw from the full PAID pool with no past-winner
-- exclusion — a ticket (or guest) that already won an hourly prize can
-- still win the 14K gold ring.
--
-- Hourly prizes keep the no-double-winner rule (exclude already-won tickets).
-- Grand prize keeps the paid-only rule (is_complimentary = false) but drops
-- the won-ticket exclusion.

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
    -- Grand prize: PAID entries only, NO past-winner exclusion.
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
     where e.is_complimentary = false
     order by random() limit 1;
  else
    -- Hourly prizes: whole pool, exclude tickets that already won.
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
