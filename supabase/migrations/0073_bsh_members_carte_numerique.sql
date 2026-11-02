-- ═══════════════════════════════════════════════════════════
-- 0073_bsh_members_carte_numerique.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-11-02
-- Objet : "carte de membre numérique BSH Members" demandée par
--   Renée-Lise. Audité avant d'écrire une ligne de SQL :
--   MembersPriveClient.tsx (espace membre déjà en ligne) couvre déjà
--   statut, pseudonyme et avantages actifs via member_benefits — mais
--   cette table n'est référencée que par UNE lecture dans tout le
--   code (src/components/BellaiaApp.tsx:859), sans aucun écran de
--   gestion fondatrice. Vu cette session ce qui est arrivé à
--   bellaia_commandes/invoices ("documentées comme préexistantes",
--   en réalité absentes), je ne suppose pas qu'elle existe déjà :
--   create table if not exists la garantit dans tous les cas, avec
--   exactement les colonnes déjà utilisées par la lecture existante
--   (id, title, description, valid_until, is_active, created_at) —
--   sans rien y ajouter de non vérifié.
--
--   Ce qui manquait réellement pour la carte demandée :
--     - Un identifiant interne et une date d'adhésion : pas de
--       nouvelle colonne nécessaire — l'identifiant est l'id du
--       profil (profiles.id, déjà là), la date d'adhésion se déduit
--       de bsh_members_demandes.decision_le (decision='acceptee'),
--       déjà en place.
--     - Les avantages n'ont aucune gestion fondatrice (RLS à
--       vérifier/sécuriser pour la lecture membre ET ajouter l'accès
--       fondatrice pour la gestion).
--     - "Invitations reçues" : bsh_invitations (migration 0071) n'a
--       qu'un nom_destinataire en texte libre, aucun lien vers un
--       compte — ajout d'un profile_id optionnel pour permettre de
--       rattacher une invitation à une membre connue, sans rien
--       casser pour les invitations existantes (nullable, les
--       anciennes restent valides en texte libre).
--
-- Impact : 1 table garantie exister (additive, idempotente), 1
--   colonne nullable ajoutée à bsh_invitations, policies RLS pour
--   member_benefits (fondatrice gère, toute cliente connectée lit
--   les avantages actifs — même portée que le code existant) et pour
--   la lecture des invitations liées à son propre profil.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.member_benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_benefits enable row level security;

drop policy if exists member_benefits_fondatrice on public.member_benefits;
create policy member_benefits_fondatrice on public.member_benefits
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- Toute cliente connectée voit les avantages actifs (même portée que
-- la lecture déjà en place dans MembersPriveClient.tsx — ce sont les
-- avantages mis en avant publiquement une fois actifs, pas une
-- donnée sensible).
drop policy if exists member_benefits_lecture_active on public.member_benefits;
create policy member_benefits_lecture_active on public.member_benefits
  for select to authenticated
  using (is_active = true);

-- ── bsh_invitations : rattachement optionnel à une membre connue ──
alter table public.bsh_invitations
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

drop policy if exists bsh_invitations_membre_select on public.bsh_invitations;
create policy bsh_invitations_membre_select on public.bsh_invitations
  for select to authenticated
  using (profile_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.member_benefits');
--   → attendu : non nul.
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bsh_invitations'
--     and column_name='profile_id';
--   → attendu : 1 ligne.
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname='public'
--     and tablename in ('member_benefits','bsh_invitations')
--   order by tablename, policyname;
--   → attendu : member_benefits 2 lignes (fondatrice + lecture_active),
--     bsh_invitations 5 lignes au total (les 3 déjà connues de la
--     migration 0071 + bsh_invitations_membre_select).
-- ═══════════════════════════════════════════════════════════
