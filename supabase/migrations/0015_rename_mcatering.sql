-- Rename "Mcatering" → "MCatering" everywhere it surfaces to vendors
-- (store login dropdown, profile card, supplier code sheet).
-- Per vendor request.
update stores set name = 'MCatering' where id = 'store_01_mcatering';
