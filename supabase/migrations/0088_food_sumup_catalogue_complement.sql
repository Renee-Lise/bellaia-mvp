-- ═══════════════════════════════════════════════════════════
-- 0088_food_sumup_catalogue_complement.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : complète Bella'Food avec les articles de son export SumUp
--   (caisse réelle) qui ne sont pas encore dans food_recettes —
--   mini pizza/quiche, riz cantonais, soupes, tartelette, jus, thé
--   glacé, milkshakes, crème/mousses de cupuaçu, hamburgers,
--   brochettes, gratins de pâtes. Prix = prix de caisse réels
--   SumUp, tels quels (aucune marge ajoutée — contrairement aux
--   boissons sans alcool de la migration 0086 où elle avait demandé
--   +3€, elle n'a rien demandé ici : ce sont déjà ses prix de vente
--   pratiqués). Statut "brouillon" : jamais visible côté client tant
--   qu'elle n'a pas validé.
-- Non repris volontairement : l'ancienne fiche "Frite" du même
--   export (frites nature 5€, +poulet 9€, +merguez 8€, +saucisse
--   poulet 7€) — contredit sa pricing détaillée du 12/11 (migration
--   0087 : frites nature seules 3€, etc.) déjà actée ; à signaler,
--   pas à dupliquer en silence.
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
values
  -- Repas / entrées
  ('Mini pizza', 'entree', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mini quiche', 'entree', 1, 1, 10, 15, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Tartelette', 'entree', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Riz cantonais nature', 'riz', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 6.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Riz cantonais au poulet', 'riz', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 7.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Soupe créole', 'soupe', 1, 2, 20, 40, '[]'::jsonb, '{}'::text[], 13.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Soupe z''habitants', 'soupe', 1, 2, 20, 40, '[]'::jsonb, '{}'::text[], 13.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Hamburgers
  ('Hamburger standard', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 7.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Cheese burger', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 7.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Triple cheese burger', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 8.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Double cheese burger', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 9.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Double burger', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 8.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Triple burger', 'burger', 1, 1, 10, 10, '[]'::jsonb, '{}'::text[], 9.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Brochettes
  ('Brochette de bœuf', 'street_food', 1, 1, 10, 15, '[]'::jsonb, '{}'::text[], 3.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Brochette de poulet', 'street_food', 1, 1, 10, 15, '[]'::jsonb, '{}'::text[], 3.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Gratin de pâtes au fromage
  ('Gratin de pâtes au fromage sans viande', 'pates', 1, 1, 15, 25, '[]'::jsonb, '{}'::text[], 8.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Gratin de pâtes au fromage, poulet', 'pates', 1, 1, 15, 25, '[]'::jsonb, '{}'::text[], 10.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Gratin de pâtes au fromage, bœuf', 'pates', 1, 1, 15, 25, '[]'::jsonb, '{}'::text[], 12.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Jus
  ('Jus de gingembre', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Jus de gingembre curcuma', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Jus de groseille', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Jus de canne à sucre (0,33cl)', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 3.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Jus de canne à sucre (1L)', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 7.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Jus de canne à sucre (timbale)', 'jus', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Thé glacé
  ('Thé glacé au gingembre', 'the_glace', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 2.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Thé glacé à la citronnelle', 'the_glace', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 2.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Thé glacé à la menthe', 'the_glace', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 2.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Milkshakes
  ('Milkshake caramel', 'boisson', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Milkshake vanille', 'boisson', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Milkshake fraise', 'boisson', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Milkshake café', 'boisson', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Milkshake chocolat', 'boisson', 1, 1, 10, 0, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  -- Desserts cupuaçu & mousses
  ('Crème de cupuaçu', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 4.00, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mousse de cupuaçu', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 5.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mousse maracujà', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 5.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mousse moubin', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 5.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mousse au chocolat', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 4.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.'),
  ('Mousse café', 'dessert', 1, 1, 15, 0, '[]'::jsonb, '{}'::text[], 4.50, 'brouillon', 'Prix de caisse SumUp réel — à valider.');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.food_recettes
--   where notes = 'Prix de caisse SumUp réel — à valider.';
--   → attendu : 37.
-- ═══════════════════════════════════════════════════════════
