-- ═══════════════════════════════════════════════════════════
-- 0071_bsh_secret_circle_experiences.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-11-01
-- Objet : socle de données pour "BSH Secret Circle & Experiences"
--   (consigne complète de Renée-Lise, exécutée en autonomie pendant
--   qu'elle testait la boutique). Construit sur l'existant (audité
--   avant d'écrire une ligne de SQL) :
--     - bsh_evenements (0020, VALIDÉ) + budget_cible/ville (0068) :
--       on y ajoute catégorie, workflow de publication et durée,
--       SANS toucher à la colonne "statut" existante (contrainte
--       CHECK déjà en place : actif/complet/termine/annule, utilisée
--       par la policy de lecture publique déjà validée — la toucher
--       casserait ce qui marche). Le workflow brouillon/publié/
--       suspendu/archivé demandé est une colonne séparée (publie
--       boolean + statut_prepa), qui laisse "statut" gérer la
--       capacité comme avant.
--     - bsh_hotes/bsh_missions/est_hote_bsh() (0014/0018/0022) :
--       réutilisés tels quels pour le contrôle d'accès hôtesse sur
--       les invitations (section 9 : scanner/pointer).
--     - bsh_lieux/bsh_budget_lignes/bsh_checklist_items (0068) :
--       réutilisés sans changement.
--
--   Nouveau, parce que rien d'existant ne le couvre :
--     - bsh_preinscriptions : liste d'intérêt gratuite, sans
--       engagement, distincte d'une réservation — INSERT public
--       (formulaire ouvert à tous), lecture réservée fondatrice
--       (jamais les coordonnées de participantes publiques).
--     - bsh_invitations : invitations nominatives + billets, avec
--       code de contrôle d'entrée. Lecture/pointage ouverts à
--       l'hôtesse assignée à l'événement (via bsh_missions), pas à
--       n'importe qui.
--     - bsh_billets : billetterie — statut_paiement démarre à
--       'non_requis' et ne doit JAMAIS être mis à 'paye' par un
--       appel client (pas de policy d'update authenticated du tout
--       ici — uniquement fondatrice — en attendant un vrai
--       prestataire de paiement vérifié, comme demandé).
--     - bsh_messages_modeles : bibliothèque de modèles de messages
--       (préinscription, invitation, confirmation, liste d'attente,
--       rappel, ouverture des ventes, complet, remerciement, avis) —
--       copie/partage manuel uniquement, aucun envoi automatique.
--     - bsh_playlists : association musique ↔ événement (Diamond B /
--       La Louve) — lien externe en texte libre, jamais pré-rempli
--       par moi (aucun lien Diamond B réel fourni).
--
-- Sécurité : même principe que tout le reste de cette session —
--   fondatrice-only par défaut, élargi seulement là où un usage réel
--   l'exige (insert public pour les préinscriptions, lecture/pointage
--   hôtesse pour les invitations de son événement).
--
-- Impact : 4 colonnes ajoutées sur bsh_evenements (nullable/avec
--   défaut), 5 tables créées. Aucune donnée existante touchée.
-- ═══════════════════════════════════════════════════════════

-- ── bsh_evenements : catégorie + workflow de publication ────
alter table public.bsh_evenements
  add column if not exists categorie text
    check (categorie in ('boudoir_session','wolf_night','secret_wolf_ball','private_experience')),
  add column if not exists description text,
  add column if not exists duree_minutes integer,
  add column if not exists publie boolean not null default false;

comment on column public.bsh_evenements.publie is
  'Workflow de publication BSH Experiences (brouillon=false, publié=true). Indépendant de la colonne "statut" existante (capacité : actif/complet/termine/annule) — ne pas confondre les deux.';

-- ── bsh_preinscriptions ─────────────────────────────────────
create table if not exists public.bsh_preinscriptions (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid references public.bsh_evenements(id) on delete set null,
  pseudonyme text not null,
  contact text,
  majorite_declaree boolean not null default false,
  ville_preferee text,
  type_evenement_souhaite text,
  disponibilites text,
  consentement_communications boolean not null default false,
  statut text not null default 'preinscrit'
    check (statut in ('interesse','preinscrit','liste_attente','confirme','present','absent','annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_preinscriptions enable row level security;

drop policy if exists bsh_preinscriptions_creer on public.bsh_preinscriptions;
create policy bsh_preinscriptions_creer on public.bsh_preinscriptions
  for insert to anon, authenticated
  with check (majorite_declaree = true);

drop policy if exists bsh_preinscriptions_fondatrice on public.bsh_preinscriptions;
create policy bsh_preinscriptions_fondatrice on public.bsh_preinscriptions
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ── bsh_invitations ─────────────────────────────────────────
create table if not exists public.bsh_invitations (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.bsh_evenements(id) on delete cascade,
  nom_destinataire text not null,
  categorie text not null default 'invite'
    check (categorie in ('invite','cercle','members','vip','equipe')),
  -- Basé sur gen_random_uuid() (déjà utilisé partout dans ce projet,
  -- fonction native disponible) plutôt que gen_random_bytes/pgcrypto,
  -- dont l'activation sur ce projet Supabase n'a jamais été vérifiée.
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  utilisee boolean not null default false,
  date_utilisation timestamptz,
  annulee boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.bsh_invitations enable row level security;

drop policy if exists bsh_invitations_fondatrice on public.bsh_invitations;
create policy bsh_invitations_fondatrice on public.bsh_invitations
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Hôtesse avec une mission sur cet événement : peut consulter et
-- pointer (lecture + marquage utilisée/présence), pas créer/supprimer.
drop policy if exists bsh_invitations_hote_select on public.bsh_invitations;
create policy bsh_invitations_hote_select on public.bsh_invitations
  for select to authenticated
  using (
    evenement_id in (
      select m.evenement_id from public.bsh_missions m
      join public.bsh_hotes h on h.id = m.hote_id
      where h.profile_id = auth.uid() and m.evenement_id is not null
    )
  );

drop policy if exists bsh_invitations_hote_pointer on public.bsh_invitations;
create policy bsh_invitations_hote_pointer on public.bsh_invitations
  for update to authenticated
  using (
    evenement_id in (
      select m.evenement_id from public.bsh_missions m
      join public.bsh_hotes h on h.id = m.hote_id
      where h.profile_id = auth.uid() and m.evenement_id is not null
    )
  )
  with check (
    evenement_id in (
      select m.evenement_id from public.bsh_missions m
      join public.bsh_hotes h on h.id = m.hote_id
      where h.profile_id = auth.uid() and m.evenement_id is not null
    )
  );

-- ── bsh_billets ─────────────────────────────────────────────
create table if not exists public.bsh_billets (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.bsh_evenements(id) on delete cascade,
  invitation_id uuid references public.bsh_invitations(id) on delete set null,
  acheteur_nom text,
  prix numeric not null default 0,
  statut_paiement text not null default 'non_requis'
    check (statut_paiement in ('non_requis','en_attente','paye','rembourse','annule')),
  mode_paiement text,
  conditions_annulation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_billets enable row level security;

drop policy if exists bsh_billets_fondatrice on public.bsh_billets;
create policy bsh_billets_fondatrice on public.bsh_billets
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ── bsh_messages_modeles ────────────────────────────────────
create table if not exists public.bsh_messages_modeles (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  titre text not null,
  contenu text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_messages_modeles enable row level security;

drop policy if exists bsh_messages_modeles_fondatrice on public.bsh_messages_modeles;
create policy bsh_messages_modeles_fondatrice on public.bsh_messages_modeles
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ── bsh_playlists ───────────────────────────────────────────
create table if not exists public.bsh_playlists (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid references public.bsh_evenements(id) on delete cascade,
  titre text not null,
  sequence_programme text,
  lien_externe text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_playlists enable row level security;

drop policy if exists bsh_playlists_fondatrice on public.bsh_playlists;
create policy bsh_playlists_fondatrice on public.bsh_playlists
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bsh_evenements'
--     and column_name in ('categorie','description','duree_minutes','publie')
--   order by column_name;
--   → attendu : 4 lignes.
--
--   select to_regclass('public.bsh_preinscriptions') as preinscriptions,
--          to_regclass('public.bsh_invitations') as invitations,
--          to_regclass('public.bsh_billets') as billets,
--          to_regclass('public.bsh_messages_modeles') as messages,
--          to_regclass('public.bsh_playlists') as playlists;
--   → attendu : les 5 colonnes non nulles.
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname='public'
--     and tablename in ('bsh_preinscriptions','bsh_invitations','bsh_billets','bsh_messages_modeles','bsh_playlists')
--   order by tablename, policyname;
--   → attendu : bsh_preinscriptions 2, bsh_invitations 3,
--     bsh_billets 1, bsh_messages_modeles 1, bsh_playlists 1
--     (10 lignes au total).
-- ═══════════════════════════════════════════════════════════
