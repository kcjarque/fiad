-- Quest images: use each supplier's FB profile photo at 720px.
-- We can't scrape FB post content (blocked by FB; the Graph API requires
-- a token we don't have). The graph.facebook.com/{page}/picture endpoint
-- with ?width=720&height=720 is the largest we can pull without auth and
-- it gives us a brand-correct image per quest.

-- 8 Point Studios: actual FB handle is 8pointstudiosph (not 8pointstudios),
-- so backfill that on the store record so the same upgrade rule works.
update stores set
  logo_url = 'https://graph.facebook.com/8pointstudiosph/picture?width=720&height=720',
  social_media = 'https://www.facebook.com/8pointstudiosph'
  where id = 'store_38_8pointstudios';

-- Upgrade existing FB logos from ?type=large (200px) to ?width=720&height=720
-- so every quest can reference the same higher-res image.
update stores
  set logo_url = regexp_replace(logo_url, '\?.*$', '?width=720&height=720')
  where logo_url like 'https://graph.facebook.com/%/picture%';

-- Set every booth-quest's image_url to its linked store's (now upgraded) logo
update challenges c
  set image_url = s.logo_url
  from stores s
  where c.type = 'booth' and c.store_id = s.id;
