-- ═══════════════════════════════════════════════════════════
-- 0068_bsh_experiences_phase1.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : Phase 1 du module "BSH Experiences — Boudoir Sessions"
--   demandé par Renée-Lise. Construit sur l'existant plutôt que de
--   dupliquer (audité avant d'écrire une ligne de SQL) :
--     - bsh_evenements (migration 0020, VALIDÉ) existe déjà pour les
--       événements eux-mêmes — on y ajoute juste les deux champs
--       manquants (budget_cible, ville), sans toucher aux colonnes ni
--       au statut existants (déjà utilisés par l'écran admin et la
--       policy de lecture publique — aucune raison de les changer
--       pour cette phase).
--     - bsh_hotes / bsh_missions (migrations 0014/0018/0022, VALIDÉ)
--       couvrent déjà les hôtesses — rien à ajouter ici.
--   Nouveau, parce que rien d'existant ne le couvre :
--     - bsh_lieux : fiches lieux/pistes (Domaine du Lac Bleu, Office
--       de tourisme, etc.) avec suivi de contact — strictement
--       interne, jamais publique (coordonnées de prestataires,
--       tarifs en négociation).
--     - bsh_budget_lignes : lignes de budget prévisionnel/réel par
--       événement — strictement interne (données financières).
--     - bsh_checklist_items : check-list générique réutilisable,
--       accrochée à un événement, une mission ou une hôtesse via
--       (cible_type, cible_id) — pas de FK unique possible puisque
--       la cible change de table selon le type, d'où la contrainte
--       CHECK sur cible_type plutôt qu'une clé étrangère classique.
--       Une hôtesse voit uniquement SES items (sa propre fiche ou
--       ses propres missions), jamais la check-list complète d'un
--       événement (qui peut contenir des tâches admin/budget).
--
-- Sécurité : les 3 nouvelles tables sont fondatrice-only par défaut
--   (is_fondatrice()), sauf bsh_checklist_items qui ajoute une policy
--   de lecture supplémentaire pour l'hôtesse concernée, construite
--   sur les mêmes fonctions déjà en place (bsh_hotes.profile_id =
--   auth.uid(), bsh_missions liées via hote_id) — même pattern que
--   bsh_missions_propres (migration 0018), pas de nouvelle logique
--   inventée.
--
-- Impact : 2 colonnes ajoutées sur bsh_evenements (nullable), 3
--   tables créées. Aucune donnée existante touchée.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_evenements
  add column if not exists budget_cible numeric,
  add column if not exists ville text;

-- ── bsh_lieux ────────────────────────────────────────────────
create table if not exists public.bsh_lieux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text,
  ville text,
  telephone text,
  email text,
  type_lieu text,
  capacite integer,
  tarif_estime numeric,
  tarif_reel numeric,
  contact_referent text,
  date_premier_contact date,
  date_relance date,
  disponibilites text,
  conditions_commerciales text,
  statut text not null default 'a_contacter'
    check (statut in ('a_contacter','contacte','reponse_recue','devis_demande','accepte','refuse','reserve')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_lieux enable row level security;

drop policy if exists bsh_lieux_fondatrice on public.bsh_lieux;
create policy bsh_lieux_fondatrice on public.bsh_lieux
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ── bsh_budget_lignes ───────────────────────────────────────
create table if not exists public.bsh_budget_lignes (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid references public.bsh_evenements(id) on delete cascade,
  scenario text not null default 'confortable'
    check (scenario in ('economique','confortable','reel')),
  poste text not null,
  montant_prevu numeric not null default 0,
  montant_engage numeric not null default 0,
  montant_paye numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_budget_lignes enable row level security;

drop policy if exists bsh_budget_lignes_fondatrice on public.bsh_budget_lignes;
create policy bsh_budget_lignes_fondatrice on public.bsh_budget_lignes
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ── bsh_checklist_items ─────────────────────────────────────
create table if not exists public.bsh_checklist_items (
  id uuid primary key default gen_random_uuid(),
  cible_type text not null check (cible_type in ('evenement','mission','hote')),
  cible_id uuid not null,
  titre text not null,
  fait boolean not null default false,
  responsable text,
  echeance date,
  priorite text default 'normale' check (priorite in ('basse','normale','haute')),
  commentaire text,
  piece_jointe_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bsh_checklist_items enable row level security;

drop policy if exists bsh_checklist_fondatrice on public.bsh_checklist_items;
create policy bsh_checklist_fondatrice on public.bsh_checklist_items
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Une hôtesse voit (lecture seule) les items accrochés à sa propre
-- fiche hôtesse ou à l'une de ses missions — jamais ceux accrochés
-- directement à un événement (potentiellement des tâches admin).
drop policy if exists bsh_checklist_hote_propre on public.bsh_checklist_items;
create policy bsh_checklist_hote_propre on public.bsh_checklist_items
  for select to authenticated
  using (
    (cible_type = 'hote' and cible_id in (select id from public.bsh_hotes where profile_id = auth.uid()))
    or
    (cible_type = 'mission' and cible_id in (
      select m.id from public.bsh_missions m
      join public.bsh_hotes h on h.id = m.hote_id
      where h.profile_id = auth.uid()
    ))
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bsh_evenements'
--     and column_name in ('budget_cible','ville');
--   → attendu : 2 lignes.
--
--   select to_regclass('public.bsh_lieux') as lieux,
--          to_regclass('public.bsh_budget_lignes') as budget,
--          to_regclass('public.bsh_checklist_items') as checklist;
--   → attendu : les 3 colonnes non nulles.
--
--   select tablename, policyname, cmd, qual
--   from pg_policies
--   where schemaname='public' and tablename in ('bsh_lieux','bsh_budget_lignes','bsh_checklist_items')
--   order by tablename, policyname;
--   → attendu : bsh_lieux 1 ligne, bsh_budget_lignes 1 ligne,
--     bsh_checklist_items 2 lignes (fondatrice + hôtesse propre).
-- ═══════════════════════════════════════════════════════════
