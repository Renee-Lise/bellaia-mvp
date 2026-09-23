-- ═══════════════════════════════════════════════════════════
-- 0006_bsh_members_demandes.sql
-- STATUT: PROPOSITION — EN ATTENTE DE VALIDATION
-- Auteur : Claude Code · Date de rédaction : 2026-09-23
-- Objet : trace proprement les demandes d'adhésion BSH Members —
--         cahier des charges §10.3 (date de la demande, confirmation
--         18+, acceptation de la charte, date de décision,
--         administrateur ayant décidé) et §5 (note interne par
--         membre, visible admin uniquement).
-- Contexte : demanderAdhesion() (BSHMembersPage) ne fait aujourd'hui
--   que changer profiles.membership_status — rien n'enregistre la
--   date de la demande, les confirmations, ni qui a décidé quoi et
--   quand. Une nouvelle ligne par demande (plutôt que des colonnes
--   sur profiles) pour garder l'historique complet si une cliente
--   refusée redemande plus tard.
-- Impact : additive uniquement. Une nouvelle table, RLS activée dès
--   la création. Aucune table/colonne existante modifiée.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_members_demandes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  demande_le        timestamptz not null default now(),
  confirmation_18   boolean not null default false,
  charte_acceptee   boolean not null default false,
  decision          text not null default 'en_attente'
                      check (decision in ('en_attente', 'acceptee', 'refusee')),
  decision_le       timestamptz,
  decide_par        uuid references auth.users(id),
  note_interne      text,
  created_at        timestamptz not null default now()
);

alter table public.bsh_members_demandes enable row level security;

-- La cliente voit et crée ses propres demandes, ne peut ni les
-- modifier ni les supprimer une fois envoyées (même logique que
-- reservations_experiences — un enregistrement immuable de son
-- côté, la fondatrice fait évoluer la décision).
create policy demandes_select_own on public.bsh_members_demandes
  for select using (auth.uid() = user_id);
create policy demandes_insert_own on public.bsh_members_demandes
  for insert with check (auth.uid() = user_id);

-- La fondatrice et l'assistante voient et font évoluer toutes les
-- demandes (décision, note interne) — même helper que profiles.
create policy demandes_staff_all on public.bsh_members_demandes
  for all
  using (public.est_staff_bellaia())
  with check (public.est_staff_bellaia());

comment on table public.bsh_members_demandes is
  'Trace chaque demande d''adhésion BSH Members — cahier des charges §10.3. Une ligne par demande (une cliente refusée qui redemande plus tard crée une nouvelle ligne, l''historique reste).';
comment on column public.bsh_members_demandes.note_interne is
  'Note libre de la fondatrice/assistante sur cette demande — jamais visible côté cliente (aucune policy SELECT ne le permet).';

-- ═══════════════════════════════════════════════════════════
-- Fin de migration. Rien ci-dessus ne s'exécute tout seul :
-- à copier dans le SQL Editor Supabase seulement après validation.
-- ═══════════════════════════════════════════════════════════
