-- Remove anon's ability to rig the raffle. Safe to apply mid-event.
--
-- Every visitor to fiad.app holds the anon key (it ships in the JS bundle),
-- and anon currently has full CRUD on most tables. That means anyone could:
--   * insert unlimited raffle_entries for themselves
--   * set prizes.winner_guest_id directly, without drawing
--   * delete guests, stores or prizes outright
-- The Sep 12 bot wave proved the API is already being driven directly, so
-- this is demonstrated capability, not a hypothetical.
--
-- The key observation: every privileged write already goes through a
-- SECURITY DEFINER function (issue_entries, complete_challenge, draw_prize,
-- approve_override, deny_override, create_complimentary_raffle_entry). Those
-- execute as the owner, so revoking anon's direct table writes does not
-- affect them. Five tables have no client-side writes whatsoever.
--
-- Deliberately NOT touched, because the live event depends on them:
--   guests INSERT  — public registration (/rsvp and /app/register)
--   guests UPDATE  — check-in writes checked_in_at
--   admins SELECT  — login still compares the passcode client-side
-- Those need the captcha + edge-function work and real auth; they are the
-- next step, not this one.

-- 1) Tables the client never writes to — all writes go via RPC or trigger.
revoke insert, update, delete on raffle_entries        from anon;
revoke insert, update, delete on transactions          from anon;
revoke insert, update, delete on passport_stamps       from anon;
revoke insert, update, delete on challenge_completions from anon;
revoke insert, update, delete on override_requests     from anon;

-- 2) admins: login only needs SELECT. Nothing should write it from a browser.
revoke insert, update, delete on admins from anon;

-- 3) prizes: the admin console genuinely edits these from the browser, so
--    UPDATE stays — but narrowed by column so the outcome of a draw cannot be
--    written by hand. draw_prize is SECURITY DEFINER and still sets them.
revoke update on prizes from anon;
grant update (name, description, image_url, quantity, sponsored_by_store_id,
              scheduled_at, is_grand, pool_event_ids) on prizes to anon;

-- 4) Destructive operations. Nothing in the live event flow deletes anything;
--    the admin delete buttons (guest, store, prize, challenge, walkthrough
--    item) stop working until this is restored alongside real auth. That is a
--    deliberate trade: losing a button for a weekend beats losing the
--    registrant list to anyone with a browser console.
revoke delete on guests           from anon;
revoke delete on stores           from anon;
revoke delete on prizes           from anon;
revoke delete on challenges       from anon;
revoke delete on walkthrough_items from anon;
revoke delete on events           from anon;

-- 5) Same for the remaining public-facing tables that only ever receive
--    inserts from their own forms, never updates or deletes.
revoke update, delete on supplier_signups from anon;
revoke update, delete on event_inquiries  from anon;
