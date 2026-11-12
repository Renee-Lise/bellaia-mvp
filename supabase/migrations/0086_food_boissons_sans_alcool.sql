-- ═══════════════════════════════════════════════════════════
-- 0086_food_boissons_sans_alcool.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : demande explicite — boissons (essentiellement sans alcool)
--   photographiées en rayon, prix = prix relevé en magasin + 3€ de
--   marge comme demandé. Statut "brouillon" : jamais visible côté
--   client tant que Renée-Lise n'a pas validé le choix et le prix.
--   Deux articles visibles sur les photos n'avaient pas de prix
--   lisible (Berticot, Pétillant de Listel Raisin Nature) — non
--   ajoutés, à compléter si elle les veut.
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, service_evenement, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
values
  ('Freixenet sans alcool (rosé)', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   10.22, 'brouillon', 'Prix magasin relevé 7,22€ + 3€ — à valider.'),
  ('JP. Chenet Ice Edition (demi-sec)', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   10.65, 'brouillon', 'Prix magasin relevé 7,65€ + 3€ — à valider.'),
  ('Festillant Cuvée Blanche sans alcool', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   8.99, 'brouillon', 'Prix magasin relevé 5,99€ + 3€ — à valider.'),
  ('Festillant Saveur Spritz sans alcool', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   9.43, 'brouillon', 'Prix magasin relevé 6,43€ + 3€ — à valider.'),
  ('Pétillant de Listel Bio Framboise sans alcool', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   8.99, 'brouillon', 'Prix magasin relevé 5,99€ + 3€ — à valider.'),
  ('Vintense Bellini sans alcool', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   12.58, 'brouillon', 'Prix magasin relevé 9,58€ + 3€ — à valider.'),
  ('Chandon Brut (Argentine)', 'boisson', 'Boissons', 1, 1, 0, 0, '[]'::jsonb, '[]'::jsonb,
   17.35, 'brouillon', 'Prix magasin relevé 14,35€ + 3€ — à valider.');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select nom, prix_conseille, statut from public.food_recettes
--   where notes like 'Prix magasin relevé%' order by nom;
--   → attendu : 7 lignes, toutes en statut "brouillon".
-- ═══════════════════════════════════════════════════════════
