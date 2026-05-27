-- Add UPDATE policy on transactions for the anon role.
--
-- Why: 0005_enable_rls.sql granted SELECT + INSERT on transactions but not
-- UPDATE. The approveOverride / denyOverride code paths (and any future
-- code that needs to mutate a transaction row) silently fail with
-- "new row violates row-level security policy for table transactions"
-- because PostgreSQL has no policy that permits the UPDATE.
--
-- The newer RPC-based services (issue_entries, approve_override,
-- deny_override) ideally run as SECURITY DEFINER and bypass RLS, but
-- this policy is still needed as a safety net for direct table writes
-- from the client.

create policy "anon_update_transactions" on transactions
  for update to anon using (true) with check (true);
