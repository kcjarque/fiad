-- Organizer asked for more granular categories. Split the umbrella categories
-- and break out specific industries from "Others".
--
-- Splits:
--   • Musicians, Sounds & Lights → Music & Entertainment (Crimson, Harmonic)
--                                  Lights & Sounds (7th Trumpet, RDS,
--                                  Stageability)
--   • Others → Insurance (Pru Life UK)
--              Skincare (Riman)
--              Hair & Make-up (SAB HMUA, Ellen Drilon)
--              Invitations (Invitations by Ten, Print 8)
--              Mobile Wellness (Soins)
--              Credit Card (Metrobank)
--              Real Estate (Susana Heights)
--
-- Conex Media and Weddings at Work stay in "Others" — not in the rename list.
--
-- Matching CATEGORY_META entries (9 new) were added to
-- src/components/guest/FloorPlan.tsx so each new category renders with its
-- own icon and tile colour. The old "Musicians, Sounds & Lights" CATEGORY_META
-- entry is kept as a defensive safety net for any non-prod DB that hasn't
-- been migrated yet.

update stores set category = 'Music & Entertainment' where id = 'store_08_crimson_ensemble';
update stores set category = 'Music & Entertainment' where id = 'store_harmonic_vibes';

update stores set category = 'Lights & Sounds'       where id = 'store_44_7th_trumpet_lights_sounds';
update stores set category = 'Lights & Sounds'       where id = 'store_rds_lights_sounds';
update stores set category = 'Lights & Sounds'       where id = 'store_31_stageability_lights_sounds';

update stores set category = 'Insurance'             where id = 'store_prulife_uk';
update stores set category = 'Skincare'              where id = 'store_13_riman';

update stores set category = 'Hair & Make-up'        where id = 'store_15_sab_hmua';
update stores set category = 'Hair & Make-up'        where id = 'store_30_ellen_drilon_make_up_group';

update stores set category = 'Invitations'           where id = 'store_46_invitations_by_ten';
update stores set category = 'Invitations'           where id = 'store_print8_invitations';

update stores set category = 'Mobile Wellness'       where id = 'store_soins_wellness';
update stores set category = 'Credit Card'           where id = 'store_metrobank_cards';
update stores set category = 'Real Estate'           where id = 'store_realty_partner';
