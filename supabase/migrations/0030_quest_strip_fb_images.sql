-- Quest images stripped of graph.facebook.com URLs.
--
-- All quest image_urls were seeded as graph.facebook.com/{page}/picture
-- which is unreliable: pages that have been renamed or that lack a
-- profile picture return either HTTP 400 (e.g. rjledesma — "Object does
-- not exist") or the generic gray-silhouette default. Both look broken
-- in the quest cards.
--
-- Null them out so the app's runtime fallback chain
--   quest.imageUrl -> store.imageUrl -> store.logoUrl
-- resolves to the local supplier-logo PNG that already lives at
-- /Suppliers Carousel FIAD/N.png (wired up in migration 0028).
--
-- Unsplash + any non-FB urls are left alone.

update challenges
   set image_url = null
 where image_url like 'https://graph.facebook.com/%';
