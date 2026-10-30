-- ═══════════════════════════════════════════════════════════
-- 0054_food_menus.sql
-- STATUT: VALIDÉ (exécutée et vérifiée le 30/10/2026)
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : table réelle pour les menus Bella'Food (zone "Menus" du
--   module). Vérifié le 30/10 : aucune table "menus" existante
--   (seule food_commandes existe, différente) — création propre,
--   rien à réconcilier.
--
-- Modélisation : un menu regroupe des lignes de recettes (food_recettes)
--   pour un nombre de personnes donné. `lignes` est un jsonb — même
--   choix que food_recettes.ingredients : chaque ligne {recette_id,
--   recette_nom, nb_portions} ; pas de contrainte FK sur les éléments
--   d'un tableau jsonb, donc l'intégrité (recette_id existant) est
--   assurée côté application au moment de l'ajout, comme pour les
--   ingrédients d'une recette.
--
-- Sécurité : outil de planification interne, jamais consulté par une
--   cliente — fondatrice uniquement (is_fondatrice()), même modèle
--   que food_recettes (migration 0049).
--
-- Impact : entièrement additif, nouvelle table.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_menus (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  type          text not null default 'buffet',
  nb_personnes  integer not null default 1,
  lignes        jsonb not null default '[]'::jsonb,
  statut        text not null default 'brouillon' check (statut in ('brouillon','valide','archive')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.food_menus is
  'Menus Bella''Food (planification interne) — lignes de recettes pour un nombre de personnes donné.';

alter table public.food_menus enable row level security;

drop policy if exists food_menus_fondatrice on public.food_menus;
create policy food_menus_fondatrice on public.food_menus
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_menus');
--   → attendu : non nul.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='food_menus';
--   → attendu : 1 ligne, food_menus_fondatrice.
-- ═══════════════════════════════════════════════════════════
