-- ═══════════════════════════════════════════════════════════
-- 0092_food_sweaty_choups.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : 4 produits de l'affiche qu'elle a envoyée (prix identiques
--   à l'affiche) : Cookies, Cup cake, Layer cup (petit/grand),
--   Gâteaux secs. Statut 'actif' directement : prix donnés
--   explicitement par elle sur une affiche, rien à valider.
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
values
  ('Cookies', 'patisserie', 1, 1, 15, 15, '[]'::jsonb, '{}'::text[], 3.00, 'actif', 'Affiche envoyée par Renée-Lise le 12/11 — prix identique à l''affiche.'),
  ('Cup cake', 'cupcake', 1, 1, 20, 20, '[]'::jsonb, '{}'::text[], 2.50, 'actif', 'Affiche envoyée par Renée-Lise le 12/11 — "à partir de" 2,50€, prix identique à l''affiche.'),
  ('Layer cup petit', 'entremet', 1, 1, 25, 10, '[]'::jsonb, '{}'::text[], 3.50, 'actif', 'Affiche envoyée par Renée-Lise le 12/11 — prix identique à l''affiche.'),
  ('Layer cup grand', 'entremet', 1, 1, 25, 10, '[]'::jsonb, '{}'::text[], 7.00, 'actif', 'Affiche envoyée par Renée-Lise le 12/11 — prix identique à l''affiche.'),
  ('Gâteaux secs (boîte de 10)', 'patisserie', 10, 1, 30, 25, '[]'::jsonb, '{}'::text[], 10.00, 'actif', 'Affiche envoyée par Renée-Lise le 12/11 — "à partir de" 10€ la boîte de 10, prix identique à l''affiche.');
