-- Wire each store to its local brand logo bundled in
-- /public/Suppliers Carousel FIAD/N.png. These replace the FB profile
-- photos (which were 200-720px, sometimes outdated) and the DiceBear
-- placeholders. 49 of 53 stores get a real logo this pass; 4 still
-- need one supplied (Conex Media, Harmonic Vibes, Susana Heights,
-- Tiger Shoes).

update stores set logo_url = '/Suppliers%20Carousel%20FIAD/1.png'  where id = 'store_ba33_lukas_steak';                 -- Luka's Steak
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/2.png'  where id = 'store_24_kate_s_confections';            -- Kate's Confections
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/3.png'  where id = 'store_16_perfect_cellar';                -- Perfect Cellar
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/4.png'  where id = 'store_20_fenrir_s_forest';               -- Fenrir's Forest
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/5.png'  where id = 'store_ba15_sharons_delight';             -- Sharon's Delight
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/6.png'  where id = 'store_33_ajt_events';                    -- AJT Events  (★ guess)
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/7.png'  where id = 'store_02_88_powerhouse_event_mgt_inc';   -- 88 Powerhouse Event Mgt
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/8.png'  where id = 'store_23_jhossa_events_mgt';             -- Jhossa Events Mgt
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/9.png'  where id = 'store_ba06_love_hues';                   -- Love Hues
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/10.png' where id = 'store_28_craftman_s_sheep';              -- Craftman's Sheep
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/11.png' where id = 'store_32_shutterloop';                   -- Shutterloop
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/12.png' where id = 'store_peridot_photoman';                 -- Peridot Studios
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/13.png' where id = 'store_37_bloom_in_pink';                 -- Bloom in Pink
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/14.png' where id = 'store_18_heinoah_entertainment';         -- Heinoah Entertainment  (★ guess)
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/15.png' where id = 'store_45_abcd_toteful_creations';        -- ABCD Toteful Creations
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/16.png' where id = 'store_ba31_from_paulyn';                 -- From Paulyn
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/17.png' where id = 'store_01_mcatering';                     -- MCatering
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/18.png' where id = 'store_19_arlene_s_catering';             -- Arlene's Catering
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/19.png' where id = 'store_mella_hotel';                      -- Mella Hotel
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/20.png' where id = 'store_ba01_brittany_mella';              -- Brittany Hotel BGC
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/21.png' where id = 'store_42_manila_yacht_cruises';          -- Manila Yacht Cruises
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/22.png' where id = 'store_38_8pointstudios';                 -- 8pointstudios
-- 23.png = 88 Powerhouse Multimedia (skipped — that account was deleted)
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/24.png' where id = 'store_40_permala_photo_video';           -- Permala
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/25.png' where id = 'store_50_mb_visuals';                    -- MB Visuals  (★ guess)
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/26.png' where id = 'store_35_romierre_jewelry';              -- Romierre Jewelry
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/27.png' where id = 'store_ba17_vaella_jewelry';              -- Vaella Jewelry
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/28.png' where id = 'store_36_graciabelle_s_flowershop';      -- Graciabelle's Flowershop
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/29.png' where id = 'store_88ph_flower_delivery';             -- 88phflowerdelivery
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/30.png' where id = 'store_legworks_events';                  -- Legworks Events Management
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/31.png' where id = 'store_belle_fete_shoes';                 -- Belle Fête
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/32.png' where id = 'store_26_emil_ocampo';                   -- Emil Ocampo
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/33.png' where id = 'store_30_ellen_drilon_make_up_group';    -- Ellen Drilon Makeup
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/34.png' where id = 'store_15_sab_hmua';                      -- SAB HMUA
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/35.png' where id = 'store_46_invitations_by_ten';            -- Invitations by Ten
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/36.png' where id = 'store_print8_invitations';               -- Print 8 Invitations
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/37.png' where id = 'store_31_stageability_lights_sounds';    -- Stageability
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/38.png' where id = 'store_rds_lights_sounds';                -- RDS Lights & Sounds
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/39.png' where id = 'store_44_7th_trumpet_lights_sounds';     -- 7th Trumpet
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/40.png' where id = 'store_08_crimson_ensemble';              -- Crimson Thread Ensemble
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/41.png' where id = 'store_27_rj_ledesma';                    -- RJ Ledesma
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/42.png' where id = 'store_07_dj_adam_wish_107_5';            -- DJ Adam
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/43.png' where id = 'store_34_jp_rosario';                    -- JP Rosario
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/44.png' where id = 'store_51_jaymee_antonio';                -- Jaymee Antonio
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/45.png' where id = 'store_17_jazper_tiongson';               -- Jazper Tiongson
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/46.png' where id = 'store_prulife_uk';                       -- Pru Life UK
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/47.png' where id = 'store_metrobank_cards';                  -- Metrobank Credit Cards
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/48.png' where id = 'store_soins_wellness';                   -- Soins Mobile Wellness
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/49.png' where id = 'store_13_riman';                         -- Riman
update stores set logo_url = '/Suppliers%20Carousel%20FIAD/50.png' where id = 'store_48_weddings_at_work_w_w';          -- Weddings at Work W@W
