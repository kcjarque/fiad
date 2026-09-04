/**
 * Canonical FIAD supplier categories, matching the client's official
 * "Industry / Services" list. Used by the /suppliers application form
 * (what do you provide?) and the "need help organizing your event?" inquiry
 * form (which supplier are you looking for?). 'Others' stays last as the
 * sentinel that reveals a "please specify" field in both forms.
 */
export const SUPPLIERS = [
  'Reception/ Hotel',
  'Photo & Video',
  'Wedding Planner/ Coordinator',
  'Caterer',
  'Event Stylist/ Florist',
  'Couturier/ Gown Rentals',
  'Sounds & Lights',
  'Photo Booths',
  'Mobile Bar/ Coffee Bar/ Wines',
  'Food Stations',
  'Cakes',
  'Printed Invitations/ Website',
  'Souvenirs & Favors',
  'Hair & Make Up Artist',
  'Jeweler',
  'Shoes',
  'Host',
  'Home Service Nail & Massage/ Skincare',
  'Insurance/ Home Investment',
  'Others',
] as const;
