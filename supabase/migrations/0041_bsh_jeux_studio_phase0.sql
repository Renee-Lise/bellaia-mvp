-- ═══════════════════════════════════════════════════════════
-- 0041_bsh_jeux_studio_phase0.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : Phase 0 du chantier "BSH Secret Games communautaire" —
--   fondation du Studio d'administration côté fondatrice.
--
-- Constat : bsh_jeux_cartes (migration 0016) est une liste plate de
--   cartes, sans notion de "jeu" — tout appartient implicitement au
--   même jeu "Amour, Gloire ou Audace". Pour accueillir d'autres
--   jeux (Les Trois Portes, Tu préfères ?, Action ou Vérité — phase
--   1) sans tout reconstruire, il faut d'abord regrouper les cartes
--   par jeu.
--
-- Ce que cette migration fait :
--   1. Crée `bsh_jeux` (un jeu = un ensemble de cartes avec son
--      propre statut éditorial, son icône, son type).
--      - intensite (douceur/mystere/audace/piment/surprise) : colonne
--        ajoutée dès maintenant pour ne pas re-migrer à la phase 2,
--        mais non encore exploitée côté UI.
--      - statut à 6 valeurs (brouillon/en_attente/programme/publie/
--        suspendu/archive), comme demandé : rien n'est publié
--        automatiquement, la fondatrice contrôle chaque étape.
--   2. Ajoute `bsh_jeux_cartes.jeu_id` (nullable, on delete set
--      null — non destructif si un jeu est supprimé).
--   3. Seed : crée le jeu "Amour, Gloire ou Audace" (déjà publié,
--      c'est le jeu actuellement en ligne sur /bsh/secret-games) et
--      y rattache les cartes existantes qui n'ont pas encore de
--      jeu_id — sans ce rattachement, les 9 cartes déjà en place
--      resteraient orphelines après l'ajout de la colonne.
--
-- RLS : mêmes principes que bsh_jeux_cartes (0016) — fondatrice ALL,
--   lecture publique uniquement des jeux statut='publie'.
--
-- Impact : entièrement additif (CREATE TABLE, ALTER TABLE ADD
--   COLUMN, INSERT/UPDATE idempotents). Aucune ligne existante
--   supprimée ou modifiée en dehors du rattachement jeu_id.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_jeux (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null,
  description  text,
  icone        text not null default '🎴',
  type_jeu     text not null default 'cartes_defis'
               check (type_jeu in ('cartes_defis','jeu_de_role','quiz_sondage','enigme_mystere','autre')),
  intensite    text not null default 'audace'
               check (intensite in ('douceur','mystere','audace','piment','surprise')),
  statut       text not null default 'brouillon'
               check (statut in ('brouillon','en_attente','programme','publie','suspendu','archive')),
  ordre        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.bsh_jeux is
  'Un jeu BSH Secret Games (ensemble de cartes) — regroupe bsh_jeux_cartes.jeu_id. Studio fondatrice, phase 0.';

alter table public.bsh_jeux enable row level security;

drop policy if exists bsh_jeux_fondatrice on public.bsh_jeux;
create policy bsh_jeux_fondatrice on public.bsh_jeux
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

drop policy if exists bsh_jeux_lecture_publique on public.bsh_jeux;
create policy bsh_jeux_lecture_publique on public.bsh_jeux
  for select to anon, authenticated
  using (statut = 'publie');

alter table public.bsh_jeux_cartes
  add column if not exists jeu_id uuid references public.bsh_jeux(id) on delete set null;

-- Seed : rattache les cartes déjà en place au jeu "Amour, Gloire ou
-- Audace" (idempotent — ne recrée rien si déjà fait).
with nouveau_jeu as (
  insert into public.bsh_jeux (nom, description, icone, type_jeu, intensite, statut, ordre)
  select
    'Amour, Gloire ou Audace',
    'Le jeu de cartes original de BSH Secret Games — une question à chaque tirage.',
    '❤️', 'cartes_defis', 'audace', 'publie', 1
  where not exists (select 1 from public.bsh_jeux where nom = 'Amour, Gloire ou Audace')
  returning id
)
update public.bsh_jeux_cartes
set jeu_id = (select id from nouveau_jeu)
where jeu_id is null
  and exists (select 1 from nouveau_jeu);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from pg_policies
--   where schemaname='public' and tablename='bsh_jeux';
--   → attendu : 2.
--
--   select id, nom, statut from public.bsh_jeux;
--   → attendu : 1 ligne, "Amour, Gloire ou Audace", statut='publie'.
--
--   select count(*) from public.bsh_jeux_cartes where jeu_id is null;
--   → attendu : 0 (toutes les cartes existantes sont rattachées).
-- ═══════════════════════════════════════════════════════════
