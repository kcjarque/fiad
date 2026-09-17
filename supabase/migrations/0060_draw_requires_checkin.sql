-- Raffle draws require the guest to be checked in at the venue.
--
-- Context: the public /rsvp funnel has no captcha or rate limit, and anon can
-- insert into guests. From Sept 12 2026 the Brittany event took a wave of
-- automated signups — by Sept 16, 26 of 35 registrations that day were
-- random-string names using throwaway addresses. Every new guest gets an
-- automatic complimentary raffle entry (0047), so those fake accounts are
-- sitting in the hourly draw pools.
--
-- Rather than trying to classify real vs fake (an arms race, and it would
-- punish a real guest with an odd name), gate eligibility on something a bot
-- cannot do: physically turn up and get scanned at the door. This also
-- matches how the raffle is actually run — you must be present to win.
--
-- Applies to BOTH branches:
--   grand  → checked in + PAID only, no past-winner exclusion, pooled across
--            pool_event_ids (0059)
--   hourly → checked in, own event, excluding tickets that already won
--
-- Operational dependency: nothing sets guests.checked_in_at except a
-- successful check-in, so if the door is not staffed the pool is empty and
-- the draw returns null. The admin page surfaces that as "no entries
-- available" before anyone hits Spin.

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
    select e.guest_id, e.ticket_number
      into v_winner_guest, v_winner_ticket
      from raffle_entries e
      join guests g on g.id = e.guest_id
     where e.event_id = any(v_pool)
       and e.is_complimentary = false
       and g.checked_in_at is not null
     order by random() limit 1;
  else
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

-- Supports the join above on the hot path during a live draw.
create index if not exists guests_checked_in_idx on guests (checked_in_at)
  where checked_in_at is not null;
