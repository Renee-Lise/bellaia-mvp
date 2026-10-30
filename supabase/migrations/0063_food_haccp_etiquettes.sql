-- ═══════════════════════════════════════════════════════════
-- 0063_food_haccp_etiquettes.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : finir Bella'Food, lot 3/3 (dernier). FoodHACCP.tsx (3
--   concepts : relevés de température, fiches de nettoyage,
--   traçabilité) et FoodEtiquettes.tsx n'étaient encore que des
--   mocks en mémoire. Vérifié le 30/10 : aucune des quatre tables
--   n'existe — création propre.
--
-- Sécurité : registres de conformité internes, jamais consultés par
--   une cliente — fondatrice uniquement (is_fondatrice()).
--
-- Impact : entièrement additif, quatre nouvelles tables.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_haccp_releves (
  id           uuid primary key default gen_random_uuid(),
  zone         text not null,
  temperature  numeric not null,
  date_heure   timestamptz not null default now(),
  operateur    text,
  conforme     boolean not null default true,
  action       text,
  created_at   timestamptz not null default now()
);

comment on table public.food_haccp_releves is
  'Relevés de température HACCP Bella''Food (chambre froide, congélateur, laboratoire, transport).';

alter table public.food_haccp_releves enable row level security;

drop policy if exists food_haccp_releves_fondatrice on public.food_haccp_releves;
create policy food_haccp_releves_fondatrice on public.food_haccp_releves
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_haccp_nettoyage (
  id              uuid primary key default gen_random_uuid(),
  zone            text not null,
  date            date not null default current_date,
  heure           text,
  operateur       text,
  produit_utilise text,
  valide          boolean not null default true,
  signature       text,
  observations    text,
  created_at      timestamptz not null default now()
);

comment on table public.food_haccp_nettoyage is
  'Fiches de nettoyage HACCP Bella''Food.';

alter table public.food_haccp_nettoyage enable row level security;

drop policy if exists food_haccp_nettoyage_fondatrice on public.food_haccp_nettoyage;
create policy food_haccp_nettoyage_fondatrice on public.food_haccp_nettoyage
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_haccp_tracabilite (
  id                        uuid primary key default gen_random_uuid(),
  production_id             uuid references public.food_productions(id) on delete set null,
  recette_nom               text not null,
  date_production           date not null default current_date,
  lots_ingredients          jsonb not null default '[]'::jsonb,
  operateur                 text,
  temperature_cuisson       numeric,
  temperature_conservation  numeric,
  dlc                       date,
  observations              text,
  created_at                timestamptz not null default now()
);

comment on table public.food_haccp_tracabilite is
  'Fiches de traçabilité HACCP Bella''Food — lots d''ingrédients utilisés par production.';

alter table public.food_haccp_tracabilite enable row level security;

drop policy if exists food_haccp_tracabilite_fondatrice on public.food_haccp_tracabilite;
create policy food_haccp_tracabilite_fondatrice on public.food_haccp_tracabilite
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_etiquettes (
  id                      uuid primary key default gen_random_uuid(),
  nom_produit             text not null,
  date_fabrication        date not null default current_date,
  dlc                     date,
  ddm                     date,
  numero_lot              text,
  allergenes              jsonb not null default '[]'::jsonb,
  ingredients             text,
  poids                   text,
  volume                  text,
  conditions_conservation text,
  reference_production    text,
  mention                 text not null default 'client' check (mention in ('interne','client','livraison')),
  format                  text not null default 'moyen' check (format in ('petit','moyen','boite','bouteille','pot_glace')),
  created_at              timestamptz not null default now()
);

comment on table public.food_etiquettes is
  'Étiquettes générées pour les produits Bella''Food (DLC/DDM, lot, allergènes).';

alter table public.food_etiquettes enable row level security;

drop policy if exists food_etiquettes_fondatrice on public.food_etiquettes;
create policy food_etiquettes_fondatrice on public.food_etiquettes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_haccp_releves'),
--          to_regclass('public.food_haccp_nettoyage'),
--          to_regclass('public.food_haccp_tracabilite'),
--          to_regclass('public.food_etiquettes');
--   → attendu : les quatre non nuls.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public'
--     and tablename in ('food_haccp_releves','food_haccp_nettoyage','food_haccp_tracabilite','food_etiquettes')
--   order by tablename;
--   → attendu : 4 lignes.
-- ═══════════════════════════════════════════════════════════
