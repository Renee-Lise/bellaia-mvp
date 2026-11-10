-- ═══════════════════════════════════════════════════════════
-- 0082_bsh_parties_multijoueur.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-10
-- Objet : demande explicite de Renée-Lise — de vraies parties
--   multijoueurs pour BSH Secret Games ET BSH Secret Duo (réponse
--   "Les deux en parallèle"), en tour par tour pour une première
--   démo (réponse "tour par tour pour la démo"), avec accès par
--   compte Bellaïa OU pseudo (réponse "Les deux"). Secret Games et
--   Secret Duo partagent déjà une seule table bsh_jeux filtrée par
--   mode ("communautaire"/"duo") — ce système de parties leur est
--   donc commun, un seul jeu_id suffit pour les deux.
--
-- Architecture retenue (conforme à l'exigence explicite de Renée-
-- Lise : "elle doit savoir s'il y a des parties en cours, avoir les
-- identifiants des participants et l'identifiant des parties, même
-- si elle n'a pas accès aux parties") :
--
--   1. bsh_parties — métadonnées d'une partie (qui/quoi/quand),
--      PAS son contenu de jeu. Fondatrice : lecture seule (policy).
--   2. bsh_parties_participants — qui a rejoint quelle partie
--      (client_id si connectée, sinon pseudo). Fondatrice : lecture
--      seule (policy) — c'est exactement "les identifiants des
--      participants" demandés.
--   3. bsh_parties_tirages — le contenu réel de la partie (cartes
--      tirées, dans l'ordre). AUCUNE policy pour quiconque, fondatrice
--      incluse : cette table n'est jamais lue en direct, seulement via
--      les routes API (clé service_role, qui contourne RLS côté
--      serveur après vérification que l'appelant est bien
--      participant·e de cette partie précise). C'est la séparation
--      stricte contenu / méta-données demandée, implémentée comme
--      une vraie contrainte technique (deux tables, deux régimes
--      d'accès différents) et non une simple convention d'écran.
--
-- Aucune table existante modifiée ni supprimée. Écriture (créer une
-- partie, rejoindre, tirer une carte) exclusivement via les nouvelles
-- routes API — aucune policy INSERT/UPDATE n'est créée ici pour
-- anon/authenticated, donc l'API REST Supabase directe ne permet à
-- personne d'écrire dans ces 3 tables ; seules les routes serveur
-- (service_role) le peuvent, après avoir vérifié le code de partie.
-- ═══════════════════════════════════════════════════════════

-- client_id référence public.profiles(id) — c'est l'identité réelle des
-- clientes BSH (auth.uid(), via useBshEspace), pas la table clients du
-- CRM fondatrice (Food/Events) : même convention que bsh_jeux_tirages
-- (migration 0016), pour rester cohérent avec le modèle d'identité déjà
-- en place côté Secret Games/Secret Duo.
create table if not exists public.bsh_parties (
  id uuid primary key default gen_random_uuid(),
  jeu_id uuid references public.bsh_jeux(id) on delete set null,
  code text not null unique,
  statut text not null default 'en_cours' check (statut in ('en_cours','terminee')),
  cree_par_client_id uuid references public.profiles(id) on delete set null,
  cree_par_pseudo text,
  tour_actuel int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bsh_parties_participants (
  id uuid primary key default gen_random_uuid(),
  partie_id uuid not null references public.bsh_parties(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  pseudo text,
  rejoint_le timestamptz not null default now(),
  constraint bsh_parties_participants_identite check (client_id is not null or pseudo is not null)
);

create table if not exists public.bsh_parties_tirages (
  id uuid primary key default gen_random_uuid(),
  partie_id uuid not null references public.bsh_parties(id) on delete cascade,
  carte_id uuid references public.bsh_jeux_cartes(id) on delete set null,
  tour int not null,
  tire_par_participant_id uuid references public.bsh_parties_participants(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bsh_parties_code_idx on public.bsh_parties(code);
create index if not exists bsh_parties_participants_partie_idx on public.bsh_parties_participants(partie_id);
create index if not exists bsh_parties_tirages_partie_idx on public.bsh_parties_tirages(partie_id);

alter table public.bsh_parties enable row level security;
alter table public.bsh_parties_participants enable row level security;
alter table public.bsh_parties_tirages enable row level security;

drop policy if exists bsh_parties_fondatrice_lecture on public.bsh_parties;
create policy bsh_parties_fondatrice_lecture on public.bsh_parties
  for select to authenticated
  using (public.is_fondatrice());

drop policy if exists bsh_parties_participants_fondatrice_lecture on public.bsh_parties_participants;
create policy bsh_parties_participants_fondatrice_lecture on public.bsh_parties_participants
  for select to authenticated
  using (public.is_fondatrice());

-- Intentionnellement aucune policy sur bsh_parties_tirages — voir
-- note d'architecture ci-dessus. La fondatrice ne peut pas lire cette
-- table, même via l'interface Supabase avec son propre compte ; seule
-- la clé service_role (routes API serveur) le peut.

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.bsh_parties'),
--          to_regclass('public.bsh_parties_participants'),
--          to_regclass('public.bsh_parties_tirages');
--   → attendu : les 3 non nuls.
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname='public' and tablename in
--     ('bsh_parties','bsh_parties_participants','bsh_parties_tirages');
--   → attendu : 2 lignes (bsh_parties, bsh_parties_participants),
--     AUCUNE ligne pour bsh_parties_tirages.
-- ═══════════════════════════════════════════════════════════
