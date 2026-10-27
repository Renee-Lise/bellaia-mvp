-- ═══════════════════════════════════════════════════════════
-- 0020_bsh_evenements.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : l'onglet "Events" de BSH → back-office (BSHF) n'avait
--   JAMAIS de table réelle derrière lui — const [bshEvts, setBshEvts]
--   = useStore("b5:bsh:evts", EVTS_BSH_INIT) est un hook 100%
--   localStorage, jamais connecté à Supabase (ni en lecture ni en
--   écriture). C'est le même "mirage" que celui déjà corrigé pour
--   Stock, en pire : Stock lisait au moins la vraie base.
--
--   Cette même liste d'événements (bshEvts) est aussi passée à
--   ClientBSH côté public — donc un événement créé ici n'a jamais
--   été visible par une cliente sur un autre appareil, ni persistant
--   d'un rechargement à l'autre.
--
-- Choix de modélisation : table dédiée BSH (pas de colonne univers,
--   contrairement à stocks/clients qui sont partagées entre pôles) —
--   lecture publique des événements actifs (comme stocks pour la
--   boutique), gestion complète réservée à la fondatrice.
--
-- Impact : entièrement additif.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_evenements (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  ico               text default '✨',
  date_evenement    date,
  lieu              text,
  capacite          integer not null default 20,
  places_restantes  integer not null default 20,
  prix              numeric not null default 0,
  statut            text not null default 'actif' check (statut in ('actif','complet','termine','annule')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.bsh_evenements is
  'Événements/soirées Bella''Secret Home avec gestion de capacité — géré par la fondatrice, lu publiquement (événements actifs uniquement).';

alter table public.bsh_evenements enable row level security;

drop policy if exists bsh_evenements_lecture_publique on public.bsh_evenements;
create policy bsh_evenements_lecture_publique on public.bsh_evenements
  for select to anon, authenticated
  using (statut in ('actif','complet'));

drop policy if exists bsh_evenements_fondatrice on public.bsh_evenements;
create policy bsh_evenements_fondatrice on public.bsh_evenements
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select table_name from information_schema.tables
--   where table_schema='public' and table_name='bsh_evenements';
--   → attendu : 1 ligne.
--
--   select policyname, cmd, roles, permissive from pg_policies
--   where tablename='bsh_evenements' order by policyname;
--   → attendu : 2 lignes, toutes permissive = true.
--
--   Test anon (doit réussir, 0 ligne si aucun événement créé) :
--   begin;
--   set local role anon;
--   select nom from public.bsh_evenements;
--   rollback;
-- ═══════════════════════════════════════════════════════════
