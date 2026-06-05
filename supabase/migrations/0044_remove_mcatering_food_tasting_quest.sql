-- MCatering asked for their food tasting quest to be removed
-- ("Patanggal na lang daw po ito, Sir"). Drop the row; FK on
-- challenge_completions cascades.

delete from challenges where id = 'q_food_tasting';
