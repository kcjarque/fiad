-- Remove the probe row written while verifying the 0067 permission fix.
--
-- Confirming anon INSERT on passport_stamps was restored required an actual
-- insert against production, which attached a stamp to a real guest and store.
-- A stray stamp is not harmless — passport progress drives challenge
-- completion — so it is removed here. anon cannot delete passport_stamps by
-- design, hence the migration.

delete from passport_stamps where id = 'stamp_perm_probe';
