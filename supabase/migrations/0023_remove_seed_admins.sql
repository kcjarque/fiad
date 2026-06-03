-- Remove the seed/demo admins before the live event so only the real
-- operations account (adm_fiad / admin@fiad.ph) can sign in.
delete from admins where id in ('adm_1', 'adm_2', 'adm_3');
