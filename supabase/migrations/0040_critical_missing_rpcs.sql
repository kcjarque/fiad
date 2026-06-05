-- ────────────────────────────────────────────────────────────────────────
-- CRITICAL FIX FOR EVENT DAY
-- ────────────────────────────────────────────────────────────────────────
-- Three RPC functions were referenced from the client (transactionService
-- and overrideService) but were never actually created in any migration —
-- migration 0008's comment even called them out as "ideally" implemented
-- but they were skipped. The result: any production store-staff scan that
-- tries to award raffle entries fails with PGRST202 ("function not found").
-- This migration creates all three. SECURITY DEFINER so they bypass RLS;
-- granted to anon since the app uses the anon key for all client calls.
--
-- All three are idempotent — the client passes an idempotency key (or in
-- the override case, the override_id has only one valid transition each
-- direction), so retries from a flaky network won't double-charge.

-- ──────────────────────────────────────────────────────────────────────
-- issue_entries
-- ──────────────────────────────────────────────────────────────────────
-- Single happy-path call: client calls this when a store scans a guest QR.
-- - If (guest_id, store_id) total today + p_amount ≤ daily cap → APPROVED
--   creates the transaction + the per-peso raffle entries.
-- - Otherwise → pending_override + override_request row for admin review.
-- - Idempotency: transaction id is deterministically derived from the
--   idempotency key. A duplicate call returns the existing transaction
--   instead of creating a second one.

create or replace function issue_entries(
  p_idempotency_key text,
  p_store_id text,
  p_guest_id text,
  p_amount int,
  p_receipt_url text,
  p_override_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id     text := 'evt_fiad_dec25';
  v_tx_id        text := 'tx_' || p_idempotency_key;
  v_override_id  text := 'ovr_' || p_idempotency_key;
  v_rate         int;
  v_cap          int;
  v_today_total  int;
  v_entries      int;
  v_existing     transactions;
  v_existing_ovr text;
  v_ticket       text;
  i              int;
  v_attempts     int;
begin
  -- 1. Idempotency — if this transaction was already created, return its state.
  select * into v_existing from transactions where id = v_tx_id;
  if found then
    if v_existing.status = 'approved' then
      return jsonb_build_object(
        'kind', 'duplicate',
        'transaction_id', v_tx_id,
        'entries_added', v_existing.entries_issued
      );
    elsif v_existing.status = 'pending_override' then
      select id into v_existing_ovr
        from override_requests where transaction_id = v_tx_id limit 1;
      return jsonb_build_object(
        'kind', 'duplicate',
        'transaction_id', v_tx_id,
        'override_id', coalesce(v_existing_ovr, v_override_id)
      );
    else
      return jsonb_build_object('kind', 'duplicate', 'transaction_id', v_tx_id);
    end if;
  end if;

  -- 2. Event config.
  select raffle_rate, daily_cap_per_guest_per_store
    into v_rate, v_cap
    from events where id = v_event_id;
  if not found then raise exception 'event % not found', v_event_id; end if;

  -- 3. Today's spend at this store (in this guest's running tally).
  select coalesce(sum(amount), 0)
    into v_today_total
    from transactions
   where guest_id = p_guest_id
     and store_id = p_store_id
     and status in ('approved', 'pending_override')
     and timestamp >= date_trunc('day', now())
     and timestamp <  date_trunc('day', now()) + interval '1 day';

  -- 4. Within cap: APPROVED.
  if (v_today_total + p_amount) <= v_cap then
    v_entries := p_amount / v_rate;

    insert into transactions
      (id, event_id, store_id, guest_id, amount, receipt_photo_url,
       entries_issued, status, timestamp)
    values
      (v_tx_id, v_event_id, p_store_id, p_guest_id, p_amount, p_receipt_url,
       v_entries, 'approved', now());

    -- Generate the raffle tickets — retry on unique-violation (rare).
    if v_entries > 0 then
      for i in 1..v_entries loop
        v_attempts := 0;
        loop
          v_ticket := 'FIAD-' || lpad(
            ((floor(random() * 9000000))::int + 1000000)::text, 7, '0');
          begin
            insert into raffle_entries (id, event_id, guest_id, transaction_id, ticket_number)
            values (
              'rt_' || replace(gen_random_uuid()::text, '-', ''),
              v_event_id, p_guest_id, v_tx_id, v_ticket
            );
            exit;  -- success
          exception when unique_violation then
            v_attempts := v_attempts + 1;
            if v_attempts > 20 then
              raise exception 'could not generate unique ticket after 20 attempts';
            end if;
          end;
        end loop;
      end loop;
    end if;

    return jsonb_build_object(
      'kind', 'approved',
      'transaction_id', v_tx_id,
      'entries_added', v_entries
    );
  end if;

  -- 5. Over cap: PENDING_OVERRIDE — admin must approve before entries are issued.
  insert into transactions
    (id, event_id, store_id, guest_id, amount, receipt_photo_url,
     entries_issued, status, override_note, timestamp)
  values
    (v_tx_id, v_event_id, p_store_id, p_guest_id, p_amount, p_receipt_url,
     0, 'pending_override', p_override_note, now());

  insert into override_requests
    (id, transaction_id, store_id, guest_id, amount, note, status)
  values
    (v_override_id, v_tx_id, p_store_id, p_guest_id, p_amount,
     coalesce(p_override_note, 'Exceeds daily cap'), 'pending');

  return jsonb_build_object(
    'kind', 'override',
    'transaction_id', v_tx_id,
    'override_id', v_override_id
  );
end;
$$;

grant execute on function issue_entries(text, text, text, int, text, text) to anon;

-- ──────────────────────────────────────────────────────────────────────
-- approve_override
-- ──────────────────────────────────────────────────────────────────────
-- Admin approves a pending override. Idempotent: re-calling on an already-
-- approved or denied override is a no-op (status is the gate).

create or replace function approve_override(
  p_override_id text,
  p_admin_id    text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id text := 'evt_fiad_dec25';
  v_tx_id    text;
  v_guest_id text;
  v_amount   int;
  v_status   text;
  v_rate     int;
  v_entries  int;
  v_ticket   text;
  i          int;
  v_attempts int;
begin
  select transaction_id, guest_id, amount, status
    into v_tx_id, v_guest_id, v_amount, v_status
    from override_requests where id = p_override_id;
  if not found then raise exception 'override % not found', p_override_id; end if;
  if v_status <> 'pending' then return; end if;

  select raffle_rate into v_rate from events where id = v_event_id;
  v_entries := v_amount / v_rate;

  update override_requests
     set status = 'approved', responded_at = now(), responded_by = p_admin_id
   where id = p_override_id;

  update transactions
     set status = 'approved', approved_by = p_admin_id, entries_issued = v_entries
   where id = v_tx_id;

  if v_entries > 0 then
    for i in 1..v_entries loop
      v_attempts := 0;
      loop
        v_ticket := 'FIAD-' || lpad(
          ((floor(random() * 9000000))::int + 1000000)::text, 7, '0');
        begin
          insert into raffle_entries (id, event_id, guest_id, transaction_id, ticket_number)
          values (
            'rt_' || replace(gen_random_uuid()::text, '-', ''),
            v_event_id, v_guest_id, v_tx_id, v_ticket
          );
          exit;
        exception when unique_violation then
          v_attempts := v_attempts + 1;
          if v_attempts > 20 then
            raise exception 'could not generate unique ticket after 20 attempts';
          end if;
        end;
      end loop;
    end loop;
  end if;
end;
$$;

grant execute on function approve_override(text, text) to anon;

-- ──────────────────────────────────────────────────────────────────────
-- deny_override
-- ──────────────────────────────────────────────────────────────────────
-- Admin denies a pending override. Idempotent.

create or replace function deny_override(
  p_override_id text,
  p_admin_id    text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id  text;
  v_status text;
begin
  select transaction_id, status into v_tx_id, v_status
    from override_requests where id = p_override_id;
  if not found then raise exception 'override % not found', p_override_id; end if;
  if v_status <> 'pending' then return; end if;

  update override_requests
     set status = 'denied', responded_at = now(), responded_by = p_admin_id
   where id = p_override_id;

  update transactions
     set status = 'rejected', approved_by = p_admin_id
   where id = v_tx_id;
end;
$$;

grant execute on function deny_override(text, text) to anon;

-- ──────────────────────────────────────────────────────────────────────
-- Indexes the agents flagged as missing (we already had a few, but
-- raffle_entries.event_id, transactions.store_id, prizes.winner_guest_id
-- were absent and would slow scans under 500-user load).
-- ──────────────────────────────────────────────────────────────────────

create index if not exists raffle_entries_event_idx
  on raffle_entries (event_id);

create index if not exists transactions_store_ts_idx
  on transactions (store_id, timestamp desc);

create index if not exists override_requests_status_idx
  on override_requests (status);

create index if not exists prizes_winner_idx
  on prizes (winner_guest_id) where winner_guest_id is not null;

create index if not exists passport_stamps_guest_idx
  on passport_stamps (guest_id);

create index if not exists challenge_completions_guest_idx
  on challenge_completions (guest_id);
