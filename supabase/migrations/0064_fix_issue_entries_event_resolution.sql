-- URGENT: issue_entries was resolving the wrong event with two live venues.
--
-- It loaded the event config with:
--     select ... from events where status = 'live' limit 1;
-- No ORDER BY and no reference to the store or guest, so with Brittany AND
-- Mella both live it takes whichever row Postgres happens to return.
--
-- Season 1 had a single live event, so the bug was invisible. Season 2 runs
-- two venues at once, and the consequences are severe:
--   * wrong raffle_rate — Brittany is P1000/entry, Mella P100, so a Brittany
--     scan could issue 10x the entries it should
--   * wrong event_id on both the transaction and the entries, so entries
--     earned at one venue land in the OTHER venue's draw pool
--
-- Reproduced on a copy of production: a Brittany guest scanned at a Brittany
-- store received 50 entries for P5,000 (should be 5), all tagged to Mella.
--
-- Caught before the first Season 2 scan — production had zero paid entries
-- and zero Season 2 transactions when this was written, so no data needs
-- repair. If any scan happened before this is applied, check transactions for
-- rows whose event_id does not match their store's event_id.
--
-- Fix: resolve the event from the store, which belongs to exactly one venue.
-- Still requires the event to be live, preserving the original guard.

CREATE OR REPLACE FUNCTION "public"."issue_entries"("p_idempotency_key" "text", "p_store_id" "text", "p_guest_id" "text", "p_amount" integer, "p_receipt_url" "text", "p_override_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_event_id    text;
  v_raffle_rate int;
  v_daily_cap   int;
  v_spent       int;
  v_entries     int;
  v_tx_id       text;
  v_ovr_id      text;
  v_existing_id text;
  i             int;
begin
  -- H1: return immediately if this submission was already processed
  select id into v_existing_id
  from   transactions
  where  idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object('kind', 'duplicate', 'transaction_id', v_existing_id);
  end if;

  -- Load active event config
  select e.id, e.raffle_rate, e.daily_cap_per_guest_per_store
  into   v_event_id, v_raffle_rate, v_daily_cap
  from   stores s
  join   events e on e.id = s.event_id
  where  s.id = p_store_id
    and  e.status = 'live';

  if not found then
    raise exception 'store % is not attached to a live event', p_store_id;
  end if;

  -- C3: advisory lock on (guest, store, today) — concurrent submits for the
  -- same guest at the same booth queue here instead of racing past the cap check
  perform pg_advisory_xact_lock(
    hashtext(p_guest_id || '|' || p_store_id || '|' || current_date::text)::bigint
  );

  -- Read true current spend under the lock
  select coalesce(sum(amount), 0)
  into   v_spent
  from   transactions
  where  guest_id  = p_guest_id
    and  store_id  = p_store_id
    and  timestamp::date = current_date
    and  status in ('approved', 'pending_override');

  v_tx_id := 'tx_' || replace(gen_random_uuid()::text, '-', '');

  -- ── Override path ────────────────────────────────────────────────────────
  if (v_spent + p_amount) > v_daily_cap then
    insert into transactions (
      id, event_id, store_id, guest_id, amount, receipt_photo_url,
      entries_issued, status, override_note, timestamp, idempotency_key
    ) values (
      v_tx_id, v_event_id, p_store_id, p_guest_id, p_amount, p_receipt_url,
      0, 'pending_override',
      coalesce(p_override_note, 'Exceeds daily cap'),
      now(), p_idempotency_key
    );

    v_ovr_id := 'ovr_' || replace(gen_random_uuid()::text, '-', '');
    insert into override_requests (
      id, transaction_id, store_id, guest_id, amount, note, status, requested_at
    ) values (
      v_ovr_id, v_tx_id, p_store_id, p_guest_id, p_amount,
      coalesce(p_override_note, 'Exceeds daily cap'),
      'pending', now()
    );

    return jsonb_build_object(
      'kind',           'override',
      'transaction_id', v_tx_id,
      'override_id',    v_ovr_id,
      'entries_added',  0
    );
  end if;

  -- ── Approved path ────────────────────────────────────────────────────────
  -- C2: transaction + raffle entries written atomically
  v_entries := p_amount / v_raffle_rate;

  insert into transactions (
    id, event_id, store_id, guest_id, amount, receipt_photo_url,
    entries_issued, status, timestamp, idempotency_key
  ) values (
    v_tx_id, v_event_id, p_store_id, p_guest_id, p_amount, p_receipt_url,
    v_entries, 'approved', now(), p_idempotency_key
  );

  if v_entries > 0 then
    for i in 1..v_entries loop
      insert into raffle_entries (
        id, event_id, guest_id, transaction_id, ticket_number, created_at, source
      ) values (
        'rt_' || replace(gen_random_uuid()::text, '-', ''),
        v_event_id, p_guest_id, v_tx_id,
        'FIAD-' || (floor(random() * 9000000) + 1000000)::int::text,
        now(), 'transaction'
      );
    end loop;
  end if;

  return jsonb_build_object(
    'kind',           'approved',
    'transaction_id', v_tx_id,
    'entries_added',  v_entries
  );
end;
$$;