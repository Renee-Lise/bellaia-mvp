-- ═══════════════════════════════════════════════════════════
-- 0081_programme_evenement.sql
-- STATUT: PROPOSITION — à exécuter et vérifier par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-09
-- Objet : demande explicite de Renée-Lise — un compositeur de
--   "programme à thème" (menu par service + thème + décoration) pour
--   Bella'Events, croisant le catalogue Bella'Food existant.
--
--   1. food_recettes.service_evenement — classe une recette dans un
--      des 7 services d'un programme d'événement (Thème & décoration
--      n'étant pas une recette, les 6 restants : Cocktail/Mocktail,
--      Hors d'œuvre, Entrée, Plat, Dessert, Boissons). Nullable, texte
--      libre volontairement (pas de CHECK) — une recette peut rester
--      non classée tant que personne ne l'a taguée, sans bloquer quoi
--      que ce soit ; aucune recette existante n'est modifiée par
--      cette migration elle-même (le tag se fait ensuite, recette par
--      recette, depuis Bella'Food → Recettes).
--
--   2. events_programmes — un programme composé et enregistré (menu +
--      thème + décoration + total), pour la traçabilité demandée :
--      chaque programme envoyé/imprimé à une cliente reste conservé,
--      consultable plus tard. "lignes" (jsonb) porte le détail service
--      par service, qu'une ligne vienne du catalogue Food ou d'un
--      ajout libre (une cliente peut proposer ses propres choix).
--
-- Impact : 1 colonne nullable ajoutée à food_recettes (préexistante,
--   jamais modifiée ni supprimée), 1 table créée. Aucune policy
--   existante touchée.
-- ═══════════════════════════════════════════════════════════

alter table public.food_recettes
  add column if not exists service_evenement text;

create table if not exists public.events_programmes (
  id uuid primary key default gen_random_uuid(),
  reference text,
  client_nom text,
  client_tel text,
  occasion text,
  theme_nom text,
  theme_description text,
  decoration_notes text,
  date_evenement date,
  lignes jsonb not null default '[]',
  total numeric not null default 0,
  statut text not null default 'brouillon',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events_programmes enable row level security;

drop policy if exists events_programmes_fondatrice on public.events_programmes;
create policy events_programmes_fondatrice on public.events_programmes
  for all to authenticated
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_recettes'
--     and column_name='service_evenement';
--   → attendu : 1 ligne.
--
--   select to_regclass('public.events_programmes');
--   → attendu : non nul.
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='events_programmes';
--   → attendu : 1 ligne (events_programmes_fondatrice, ALL).
-- ═══════════════════════════════════════════════════════════
