-- ═══════════════════════════════════════════════════════════
-- 0085_food_recettes_fete_et_programme_images.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : deux demandes explicites de Renée-Lise.
--
--   1. food_recettes.fete_associee — le code (foodApi.ts) mappait déjà
--      ce champ vers "fete_associee" en base, mais rien ne prouvait
--      que la colonne existe réellement (table créée hors migrations,
--      directement dans Supabase). "if not exists" rend ça sûr dans
--      les deux cas. Sert à catégoriser une recette par occasion
--      (Noël, Nouvel an, Pâques, Toussaint...), demande explicite.
--
--   2. events_programmes.images — "+ Utiliser" sur un visuel doit
--      l'attacher réellement au programme (pas juste son titre en
--      texte), et un devis doit pouvoir être illustré. jsonb array
--      d'objets {titre, image_url}, nullable, défaut tableau vide.
-- ═══════════════════════════════════════════════════════════

alter table public.food_recettes
  add column if not exists fete_associee text;

alter table public.events_programmes
  add column if not exists images jsonb not null default '[]';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_recettes'
--     and column_name='fete_associee';
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='events_programmes'
--     and column_name='images';
--   → attendu : 1 ligne chacune.
-- ═══════════════════════════════════════════════════════════
