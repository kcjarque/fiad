-- Replace the placeholder schedule with the real Day 1 / Day 2 timelines
-- from the published event graphics ("Forever in a Day; Wedding, Events &
-- Debut Fair" — June 6-7, 2026). Old rows wt_sch_d1_1..6 and wt_sch_d2_1..5
-- were demo content and are wiped wholesale so renumbering is safe.

delete from walkthrough_items where type = 'schedule_item';

insert into walkthrough_items (id, event_id, type, title, content, image_url, time, sort_order) values
  -- Day 1 · Saturday, June 6
  ('wt_sch_d1_1', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Opening & Ribbon Cutting',
   'Official kickoff of the fair on the main stage.',
   null, '9:00–10:00 AM', 10),

  ('wt_sch_d1_2', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Gates Open',
   'Doors open for visitors and exhibitors. Scan your QR at the entrance.',
   null, '10:00 AM', 11),

  ('wt_sch_d1_3', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Activities All Day',
   'Riman Skincare & Bracelet Making · Hanbok Experience · Claw Machine.',
   null, '10:00 AM – 4:00 PM', 12),

  ('wt_sch_d1_4', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Wine Pairing Workshop',
   'How to choose wine and pairings for your event menu and gifting.',
   null, '4:00–6:00 PM', 13),

  ('wt_sch_d1_5', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Emil Ocampo Fashion Show & Wine Tasting',
   'Bridal runway by Emil Ocampo alongside a curated wine tasting.',
   null, '6:00–7:00 PM', 14),

  ('wt_sch_d1_6', 'evt_fiad_dec25', 'schedule_item',
   'Day 1 · Crimson Thread Ensemble & Lila Blanca Band',
   'Live performances to close out Day 1.',
   null, '7:00–8:00 PM', 15),

  -- Day 2 · Sunday, June 7
  ('wt_sch_d2_1', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Doors Open',
   'Day 2 begins. Keep collecting stamps and earning raffle entries.',
   null, '10:00 AM', 20),

  ('wt_sch_d2_2', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Activities',
   'Riman Skincare & Bracelet Making · Hanbok Experience · Claw Machine.',
   null, '10:00 AM – 2:00 PM', 21),

  ('wt_sch_d2_3', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Ask Jenne & Wedding Journal Book Signing',
   'Q&A with Jenne plus the Wedding Journal book signing session.',
   null, '2:00–4:00 PM', 22),

  ('wt_sch_d2_4', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Wine & Spirits Basics',
   'A guided introduction to wines and spirits for your event.',
   null, '4:00–6:00 PM', 23),

  ('wt_sch_d2_5', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Awarding of Suppliers',
   'Recognition of standout exhibitors and supplier awards on the main stage.',
   null, '8:30–9:30 PM', 24),

  ('wt_sch_d2_6', 'evt_fiad_dec25', 'schedule_item',
   'Day 2 · Wedding Ring Raffle & Season 2 Announcement',
   'Grand draw for the wedding ring raffle winning couple, plus the Season 2 announcement.',
   null, '9:30–10:00 PM', 25);
