-- Remove one bot signup that arrived after the 0062 cleanup.
--
-- Reported from the door (access code 092KHW). Verified before deletion:
--   name        NMdIkepWaCnniueCmmUeEpe jRpDIcQCxFwQYDMQNNI  (random string)
--   preferred_day  null  — the /rsvp form always sets this, so this row came
--                          in through the API directly, not the form
--   checked_in_at  null
--   activity       1 raffle entry (the complimentary ticket auto-issued by the
--                  0047 trigger), 0 transactions, 0 stamps, 0 completions
--
-- Deleting the guest cascades to that single entry.
--
-- Still cleanup, not a fix: /rsvp has no captcha or rate limit and anon can
-- insert into guests, so more will arrive until that path is closed.
--
-- Idempotent: a row already gone is simply not matched.

delete from guests where id = 'guest_63n608z1vuyv';
