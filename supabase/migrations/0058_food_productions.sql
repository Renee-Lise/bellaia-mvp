-- ═══════════════════════════════════════════════════════════
-- 0058_food_productions.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : table réelle pour le module Production (étape 4 du plan de
--   Renée-Lise). Vérifié le 30/10 : FoodProduction.tsx n'était encore
--   qu'un mock en mémoire (comme Achats l'était avant la migration
--   0055) — aucune production n'était jamais sauvegardée, et les
--   recettes/matériel affichés venaient de FOOD_RECETTES_INIT /
--   FOOD_MATERIEL_INIT (données figées), pas des vraies fiches.
--
-- Modélisation : même choix que food_menus/food_achats pour les
--   sous-listes (ingredients, materiel, lots_utilises, photos —
--   jsonb). recette_id référence food_recettes avec on delete set
--   null : une production garde son historique même si la recette
--   liée disparaît un jour.
--
-- Sécurité : outil de gestion interne, jamais consulté par une
--   cliente — fondatrice uniquement (is_fondatrice()), même modèle
--   que food_recettes/food_menus/food_achats.
--
-- Impact : entièrement additif, nouvelle table.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_productions (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null,
  recette_id     uuid references public.food_recettes(id) on delete set null,
  recette_nom    text not null,
  date           date not null default current_date,
  operateur      text,
  quantite       integer not null default 1,
  duree_min      integer,
  materiel       jsonb not null default '[]'::jsonb,
  ingredients    jsonb not null default '[]'::jsonb,
  lots_utilises  jsonb not null default '[]'::jsonb,
  statut         text not null default 'prevue'
                   check (statut in ('prevue','en_preparation','cuisson','decoration','terminee','livree')),
  observations   text,
  photos         jsonb not null default '[]'::jsonb,
  commande_id    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.food_productions is
  'Productions Bella''Food (planning atelier/cuisine) — ingrédients/matériel/lots en jsonb.';

alter table public.food_productions enable row level security;

drop policy if exists food_productions_fondatrice on public.food_productions;
create policy food_productions_fondatrice on public.food_productions
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_productions');
--   → attendu : non nul.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='food_productions';
--   → attendu : 1 ligne, food_productions_fondatrice.
-- ═══════════════════════════════════════════════════════════
