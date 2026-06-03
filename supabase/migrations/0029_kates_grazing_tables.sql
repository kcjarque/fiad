-- Kate's Confections: rebrand from charcuterie ("Food Carts") to grazing tables
-- per the supplier's own request.
update stores
   set category    = 'Grazing Tables',
       description = 'Beautifully styled grazing tables and curated bites for weddings, debuts, and events.'
 where id = 'store_24_kate_s_confections';
