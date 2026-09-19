-- Make the check-in log readable, and actually append-only.
--
-- Supabase applies its own defaults to new tables, which undid both halves of
-- 0076's intent:
--
--   * RLS was enabled with no policy, so the backfilled rows were invisible —
--     anon read the table and got nothing back.
--   * GRANT ALL ... TO anon was applied, so the public key could insert,
--     update and delete log rows. A tamper-able audit log is worse than none,
--     since it would be trusted.
--
-- Read stays open, matching the other admin-facing tables. Writes are revoked:
-- log_check_in() is SECURITY DEFINER, so the trigger keeps recording check-ins
-- while nothing holding the public key can rewrite history.

create policy check_ins_select_anon on check_ins for select to anon using (true);

revoke insert, update, delete on check_ins from anon;
revoke insert, update, delete on check_ins from authenticated;
