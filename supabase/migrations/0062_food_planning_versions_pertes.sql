-- ═══════════════════════════════════════════════════════════
-- 0062_food_planning_versions_pertes.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : finir Bella'Food, lot 2/3. FoodPlanning.tsx, FoodVersions.tsx
--   et FoodPertes.tsx n'étaient encore que des mocks en mémoire.
--   Vérifié le 30/10 : aucune des trois tables n'existe — création
--   propre.
--
-- Sécurité : outils de gestion interne, jamais consultés par une
--   cliente — fondatrice uniquement (is_fondatrice()).
--
-- Impact : entièrement additif, trois nouvelles tables.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_planning (
  id               uuid primary key default gen_random_uuid(),
  commande_id      text,
  nom_commande     text not null,
  date_livraison   date not null,
  taches           jsonb not null default '[]'::jsonb,
  notes_fondatrice text,
  alerte           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.food_planning is
  'Plannings de production Bella''Food — tâches J-3/J-2/J-1/Jour J en jsonb.';

alter table public.food_planning enable row level security;

drop policy if exists food_planning_fondatrice on public.food_planning;
create policy food_planning_fondatrice on public.food_planning
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_versions_recettes (
  id                 uuid primary key default gen_random_uuid(),
  recette_id         uuid not null references public.food_recettes(id) on delete cascade,
  recette_nom        text not null,
  type_version       text not null default 'version_test',
  nom_version        text not null,
  ingredients        jsonb not null default '[]'::jsonb,
  cout_matiere       numeric not null default 0,
  cout_consommables  numeric not null default 0,
  temps_production   integer not null default 0,
  prix_conseille     numeric,
  prix_premium       numeric,
  marge_estimee      numeric,
  notes              text,
  statut             text not null default 'brouillon'
                        check (statut in ('brouillon','test','validee','archivee')),
  date_creation      date not null default current_date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.food_versions_recettes is
  'Versions alternatives d''une recette (économique, premium, sans gluten...) — comparaison coût/marge.';

alter table public.food_versions_recettes enable row level security;

drop policy if exists food_versions_recettes_fondatrice on public.food_versions_recettes;
create policy food_versions_recettes_fondatrice on public.food_versions_recettes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_pertes (
  id                 uuid primary key default gen_random_uuid(),
  date               date not null default current_date,
  produit            text not null,
  recette_id         uuid references public.food_recettes(id) on delete set null,
  quantite           numeric not null default 1,
  unite              text not null default 'pièce',
  cout_estime        numeric not null default 0,
  cause              text not null,
  description        text,
  responsable        text,
  photo              text,
  action_corrective  text,
  statut             text not null default 'ouverte' check (statut in ('ouverte','traitee','archivee')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.food_pertes is
  'Pertes Bella''Food (casse, erreur de production, DLC dépassée...) — suivi coût et causes.';

alter table public.food_pertes enable row level security;

drop policy if exists food_pertes_fondatrice on public.food_pertes;
create policy food_pertes_fondatrice on public.food_pertes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_planning'),
--          to_regclass('public.food_versions_recettes'),
--          to_regclass('public.food_pertes');
--   → attendu : les trois non nuls.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public'
--     and tablename in ('food_planning','food_versions_recettes','food_pertes')
--   order by tablename;
--   → attendu : 3 lignes.
-- ═══════════════════════════════════════════════════════════
