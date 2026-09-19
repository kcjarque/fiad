-- forfeit_prize(): clear a drawn prize so it can be redrawn.
--
-- Seven forfeits across four prizes happened on Sep 19 alone, each needing a
-- migration because 0063 restricts anon's UPDATE on prizes to the admin-
-- editable columns. That restriction is deliberate — writing winner columns by
-- hand from a browser is how a raffle gets rigged — so rather than reopening
-- it, this exposes exactly one narrow operation.
--
-- SECURITY DEFINER, so it can write the winner columns while anon still
-- cannot. It only ever CLEARS them: there is no way to use this to name a
-- winner, which is the capability worth protecting.
--
-- Releases rather than disqualifies, matching every forfeit so far: the hourly
-- branch reads its no-double-winner exclusion from winning_ticket_number, so
-- clearing returns that ticket to the pool.
--
-- Returns the cleared winner so the UI can tell the operator who was released,
-- and so it is visible in the console rather than only in migration comments.

create or replace function forfeit_prize(p_prize_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize  prizes;
  v_name   text;
begin
  select * into v_prize from prizes where id = p_prize_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_such_prize');
  end if;

  if v_prize.winner_guest_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_drawn');
  end if;

  select name into v_name from guests where id = v_prize.winner_guest_id;

  update prizes
     set winner_guest_id       = null,
         winning_ticket_number = null,
         drawn_at              = null
   where id = p_prize_id;

  return jsonb_build_object(
    'ok', true,
    'prize_id', p_prize_id,
    'forfeited_guest_id', v_prize.winner_guest_id,
    'forfeited_name', coalesce(v_name, 'Guest'),
    'forfeited_ticket', v_prize.winning_ticket_number
  );
end;
$$;

grant execute on function forfeit_prize(text) to anon;
