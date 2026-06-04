-- Ms. Carol from Peridot Studios requested her booth be labelled
-- "Photo Souvenirs & Guestbooks" rather than the generic "Souvenirs".
-- Description ("On-site Photo Man and mirror selfie souvenir booths.")
-- already matches what she asked for, so only the category changes.
--
-- A matching CATEGORY_META entry was added to src/components/guest/FloorPlan.tsx
-- so the chip + floor-plan tile pick up the new label, BookHeart icon, and
-- cyan tile colour.

update stores
   set category = 'Photo Souvenirs & Guestbooks'
 where id = 'store_peridot_photoman';
