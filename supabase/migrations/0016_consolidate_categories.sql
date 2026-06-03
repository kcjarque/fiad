-- Consolidate supplier categories down to the 12 final groups.
-- Names are unchanged — this is a categorisation pass only — so the same
-- supplier name appears in the booth grid / filter, but the filter strip
-- now shows one chip per real group (no more duplicate Catering icons).

-- ── Tyron An Couture: explicitly removed by event ops ─────────────────────
delete from stores where id = 'store_ba21_tyron_an_couture';

-- ── Event Hosts ───────────────────────────────────────────────────────────
update stores set category = 'Event Hosts' where id in (
  'store_07_dj_adam_wish_107_5','store_27_rj_ledesma','store_17_jazper_tiongson',
  'store_34_jp_rosario','store_51_jaymee_antonio');

-- ── Musicians, Sounds & Lights ────────────────────────────────────────────
update stores set category = 'Musicians, Sounds & Lights' where id in (
  'store_31_stageability_lights_sounds','store_rds_lights_sounds',
  'store_44_7th_trumpet_lights_sounds','store_08_crimson_ensemble','store_harmonic_vibes');

-- ── Gowns & Custom Shoes ──────────────────────────────────────────────────
update stores set category = 'Gowns & Custom Shoes' where id in (
  'store_belle_fete_shoes','store_26_emil_ocampo','store_tiger_shoes');

-- ── Event Stylists & Florists ─────────────────────────────────────────────
update stores set category = 'Event Stylists & Florists' where id in (
  'store_36_graciabelle_s_flowershop','store_88ph_flower_delivery');

-- ── Jewelers ──────────────────────────────────────────────────────────────
update stores set category = 'Jewelers' where id in (
  'store_35_romierre_jewelry','store_ba17_vaella_jewelry');

-- ── Photo & Video ─────────────────────────────────────────────────────────
update stores set category = 'Photo & Video' where id in (
  'store_38_8pointstudios','store_40_permala_photo_video','store_88ph_multimedia',
  'store_50_mb_visuals','store_09_timeless_portraits_peridot_stu');

-- ── Hotels & Venues ───────────────────────────────────────────────────────
update stores set category = 'Hotels & Venues' where id in (
  'store_ba01_brittany_mella','store_42_manila_yacht_cruises');

-- ── Catering & Cakes ──────────────────────────────────────────────────────
update stores set category = 'Catering & Cakes' where id in (
  'store_ba31_from_paulyn','store_01_mcatering','store_19_arlene_s_catering');

-- ── Souvenirs ─────────────────────────────────────────────────────────────
update stores set category = 'Souvenirs' where id in (
  'store_ba06_love_hues','store_28_craftman_s_sheep','store_32_shutterloop',
  'store_peridot_photoman','store_peridot_video_guestbook','store_37_bloom_in_pink',
  'store_18_heinoah_entertainment','store_45_abcd_toteful_creations');

-- ── Events Management ─────────────────────────────────────────────────────
update stores set category = 'Events Management' where id in (
  'store_33_ajt_events','store_02_88_powerhouse_event_mgt_inc','store_23_jhossa_events_mgt');

-- ── Food Carts ────────────────────────────────────────────────────────────
update stores set category = 'Food Carts' where id in (
  'store_ba33_lukas_steak','store_16_perfect_cellar','store_20_fenrir_s_forest',
  'store_24_kate_s_confections','store_ba15_sharons_delight');

-- ── Others (no specific group fits) ───────────────────────────────────────
update stores set category = 'Others' where id in (
  'store_prulife_uk','store_13_riman','store_46_invitations_by_ten','store_15_sab_hmua',
  'store_30_ellen_drilon_make_up_group','store_print8_invitations','store_soins_wellness',
  'store_metrobank_cards','store_realty_partner','store_48_weddings_at_work_w_w',
  'store_conex_media');
