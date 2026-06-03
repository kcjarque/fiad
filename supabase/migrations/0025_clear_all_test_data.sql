-- Wipe all test transactional data so the live event starts fresh.
-- Keeps: guests, stores, admins, prizes, challenges, walkthrough items,
--        events — everything you've configured stays.
-- Removes: every issued transaction, raffle entry, passport stamp,
--          challenge completion, and override request to date.
--
-- Order matters for FKs:
--   raffle_entries.transaction_id  → transactions.id
--   override_requests.transaction_id → transactions.id
-- So we drain the dependents before transactions.

delete from raffle_entries;
delete from override_requests;
delete from challenge_completions;
delete from passport_stamps;
delete from transactions;
