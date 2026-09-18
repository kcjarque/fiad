-- Restore anon INSERT on passport_stamps — regression from 0063.
--
-- 0063 revoked writes on five tables on the stated basis that the client never
-- writes them. That was wrong for passport_stamps: passportService inserts a
-- stamp directly from the browser when a guest scans a booth QR (/s/:token).
-- The check that produced the claim grepped for `.insert` on the same line as
-- `.from('passport_stamps')`, but the call is chained across lines, so it was
-- missed. Guests scanning at the venue hit an RLS/permission error.
--
-- INSERT only. UPDATE and DELETE stay revoked — the client never does either,
-- and a stamp should be append-only: letting anon rewrite or remove stamps
-- would let someone edit passport progress after the fact.
--
-- The remaining 0063 revocations are unaffected and intentional: raffle_entries,
-- transactions, challenge_completions and override_requests are written only by
-- SECURITY DEFINER functions, and the delete revocations are the deliberate
-- trade that stops anyone holding the public key from wiping the event.

grant insert on passport_stamps to anon;
