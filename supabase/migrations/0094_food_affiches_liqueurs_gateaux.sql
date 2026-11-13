-- ═══════════════════════════════════════════════════════════
-- 0094_food_affiches_liqueurs_gateaux.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-13
-- Objet : 2 affiches envoyées — "Des saveurs exotiques dans votre
--   verre" (liqueurs/sirop/punch) et "Le bonheur commence par un
--   gâteau !" (gâteaux/quiches). Prix identiques aux affiches.
--   Statut 'actif' directement (prix donnés explicitement par elle).
--   Les "à partir de" sont repris tels quels comme prix de départ,
--   à ajuster par elle selon la taille/garniture réellement
--   commandée (même logique que les autres "à partir de" déjà en
--   base).
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
values
  -- Affiche "Des saveurs exotiques dans votre verre"
  ('Liqueur de Maracudja', 'cocktail', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 22.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche. Commande au +594 694 442 176.'),
  ('Liqueur d''Ananas', 'cocktail', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 22.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche. Commande au +594 694 442 176.'),
  ('Liqueur de Cerise', 'cocktail', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 22.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche. Commande au +594 694 442 176.'),
  ('Sirop de Gingembre', 'boisson', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 20.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche. Commande au +594 694 442 176.'),
  ('Punch Coco', 'cocktail', 1, 1, 0, 0, '[]'::jsonb, '{}'::text[], 25.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche. Commande au +594 694 442 176.'),
  -- Affiche "Le bonheur commence par un gâteau !"
  ('Gâteau gras (lot de 8)', 'patisserie', 8, 1, 30, 25, '[]'::jsonb, '{}'::text[], 3.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche (lot de 8).'),
  ('Comtesses (lot de 7)', 'patisserie', 7, 1, 30, 25, '[]'::jsonb, '{}'::text[], 3.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche (lot de 7).'),
  ('Gâteau américain', 'cake', 1, 2, 30, 45, '[]'::jsonb, '{}'::text[], 12.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — "à partir de" 12€, prix identique à l''affiche.'),
  ('Gâteau chocolat', 'cake', 1, 2, 30, 45, '[]'::jsonb, '{}'::text[], 15.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — "à partir de" 15€, prix identique à l''affiche.'),
  ('Gâteau marbré', 'cake', 1, 2, 30, 45, '[]'::jsonb, '{}'::text[], 15.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — prix identique à l''affiche.'),
  ('Gâteau à l''ananas', 'cake', 1, 2, 30, 45, '[]'::jsonb, '{}'::text[], 25.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — "à partir de" 25€, prix identique à l''affiche.'),
  ('Gâteau à la crème', 'cake', 1, 2, 30, 45, '[]'::jsonb, '{}'::text[], 20.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — "à partir de" 20€, prix identique à l''affiche.'),
  ('Quiches', 'entree', 1, 2, 30, 35, '[]'::jsonb, '{}'::text[], 20.00, 'actif', 'Affiche envoyée par Renée-Lise le 13/11 — "à partir de" 20€, prix identique à l''affiche.');
