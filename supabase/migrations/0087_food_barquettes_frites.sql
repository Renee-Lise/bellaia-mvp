-- ═══════════════════════════════════════════════════════════
-- 0087_food_barquettes_frites.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : prix complets de la gamme "Barquette de frites" donnés
--   explicitement par Renée-Lise le 12/11 (frites nature, frites
--   maison, suppléments, barquettes complémentaires). Résout le
--   point en attente "Barquette de frites au poulet boucané" de la
--   checklist. Chaque article gardé en statut "brouillon" : jamais
--   visible côté client avant sa validation.
--
--   Les "barquettes complémentaires" (poulet boucané, tenders,
--   crispy, duos) étaient données avec deux prix ("8 € 9 €") — ce
--   sont, comme tous les autres combos qu'elle a détaillés, le prix
--   en frites nature puis en frites maison (écart constant de +1€
--   partout ailleurs dans ce qu'elle a envoyé) : une ligne par
--   variante, pas un prix ambigu.
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
values
  -- Frites nature
  ('Barquette de frites nature', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites nature + saucisse de poulet', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 6.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites nature + merguez', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 7.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites nature + cuisse de poulet', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 8.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites nature + brochette de poulet', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 7.50, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites nature + brochette de bœuf', 'street_food', 1, 1, 10, 8, '[]'::jsonb, '{}'::text[], 7.50, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  -- Frites maison (manioc, patates douces, plantains, pommes de terre)
  ('Barquette de frites maison', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 5.00, 'brouillon', 'Frites maison : manioc, patates douces, plantains, pommes de terre. Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites maison + saucisse de poulet', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 7.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites maison + merguez', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 8.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites maison + cuisse de poulet', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 9.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites maison + brochette de poulet', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 8.50, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette de frites maison + brochette de bœuf', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 8.50, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  -- Suppléments
  ('Supplément sauce maison', 'sauce', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 0.50, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Supplément sauce fromagère cheddar-emmental', 'sauce', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 1.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Supplément cheddar fondu', 'sauce', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 1.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Supplément double portion de viande', 'accompagnement', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Supplément frites nature', 'accompagnement', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 2.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Supplément frites maison', 'accompagnement', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 3.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  -- Barquettes complémentaires — frites nature
  ('Barquette poulet boucané (frites nature)', 'street_food', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 8.00, 'brouillon', 'Résout le point "Barquette de frites au poulet boucané" en attente. Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette tenders de poulet (frites nature)', 'street_food', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 8.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette poulet crispy (frites nature)', 'street_food', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 8.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette duo saucisse et merguez (frites nature)', 'street_food', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 9.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette duo brochettes poulet et bœuf (frites nature)', 'street_food', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 10.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  -- Barquettes complémentaires — frites maison
  ('Barquette poulet boucané (frites maison)', 'street_food', 1, 1, 18, 15, '[]'::jsonb, '{}'::text[], 9.00, 'brouillon', 'Résout le point "Barquette de frites au poulet boucané" en attente. Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette tenders de poulet (frites maison)', 'street_food', 1, 1, 18, 15, '[]'::jsonb, '{}'::text[], 9.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette poulet crispy (frites maison)', 'street_food', 1, 1, 18, 15, '[]'::jsonb, '{}'::text[], 9.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette duo saucisse et merguez (frites maison)', 'street_food', 1, 1, 18, 15, '[]'::jsonb, '{}'::text[], 10.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.'),
  ('Barquette duo brochettes poulet et bœuf (frites maison)', 'street_food', 1, 1, 18, 15, '[]'::jsonb, '{}'::text[], 11.00, 'brouillon', 'Prix confirmé par Renée-Lise le 12/11.');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.food_recettes
--   where notes like 'Prix confirmé par Renée-Lise le 12/11%';
--   → attendu : 28.
-- ═══════════════════════════════════════════════════════════
