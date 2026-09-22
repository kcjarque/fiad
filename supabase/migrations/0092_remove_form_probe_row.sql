-- Remove the probe row written while verifying the RSVP form end-to-end.
--
-- One registration submitted through /rsvp after 0091 revoked anon INSERT, to
-- confirm the browser path reaches the register-guest function rather than
-- failing. Its signup_ip is set, which only the function can write, so the
-- row is itself the proof -- and now that it has served that purpose it must
-- not reach the export or any guest count.
--
-- Matched on the reserved .invalid TLD (RFC 2606), which can never belong to
-- a real address, so this cannot touch a genuine registration.
--
-- Idempotent: rows already gone are simply not matched.

delete from guests where email like '%@example.invalid';
