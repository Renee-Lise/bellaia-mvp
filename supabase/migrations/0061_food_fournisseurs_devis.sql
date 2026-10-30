-- ═══════════════════════════════════════════════════════════
-- 0061_food_fournisseurs_devis.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : finir Bella'Food, lot 1/3. FoodFournisseurs.tsx et
--   FoodDevis.tsx n'étaient encore que des mocks en mémoire, comme
--   l'étaient Achats/Production/Commandes avant d'être branchés.
--   Vérifié le 30/10 : aucune table food_fournisseurs ni food_devis
--   n'existe — création propre, rien à réconcilier.
--
-- Sécurité : outils de gestion interne, jamais consultés par une
--   cliente — fondatrice uniquement (is_fondatrice()), même modèle
--   que le reste de Bella'Food.
--
-- Impact : entièrement additif, deux nouvelles tables.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.food_fournisseurs (
  id                 uuid primary key default gen_random_uuid(),
  nom                text not null,
  logo               text,
  tel                text,
  email              text,
  site_internet      text,
  adresse            text,
  contact            text,
  categories_vendues jsonb not null default '[]'::jsonb,
  delai_moyen        integer,
  minimum_commande   numeric,
  note               integer,
  notes              text,
  actif              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.food_fournisseurs is
  'Fournisseurs Bella''Food (CRM fournisseurs).';

alter table public.food_fournisseurs enable row level security;

drop policy if exists food_fournisseurs_fondatrice on public.food_fournisseurs;
create policy food_fournisseurs_fondatrice on public.food_fournisseurs
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

create table if not exists public.food_devis (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null,
  client         text not null,
  tel            text,
  email          text,
  lignes         jsonb not null default '[]'::jsonb,
  conditions     text,
  date_creation  date not null default current_date,
  date_validite  date,
  acompte_pct    integer not null default 30,
  statut         text not null default 'brouillon'
                   check (statut in ('brouillon','envoye','accepte','refuse','expire','commande')),
  notes          text,
  commande_id    uuid references public.food_commandes(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.food_devis is
  'Devis Bella''Food — lignes jsonb, lien optionnel vers food_commandes une fois converti.';

alter table public.food_devis enable row level security;

drop policy if exists food_devis_fondatrice on public.food_devis;
create policy food_devis_fondatrice on public.food_devis
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.food_fournisseurs'), to_regclass('public.food_devis');
--   → attendu : les deux non nuls.
--
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename in ('food_fournisseurs','food_devis')
--   order by tablename;
--   → attendu : 2 lignes (food_devis_fondatrice, food_fournisseurs_fondatrice).
-- ═══════════════════════════════════════════════════════════
