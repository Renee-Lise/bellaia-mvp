-- ═══════════════════════════════════════════════════════════
-- 0023_bsh_communication.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (4 policies
--   confirmées via pg_policies, correspondance exacte à l'attendu)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : démarre le module "Communication" de l'espace fondatrice
--   BSH (publications, annonces et notifications — section 2 de la
--   consigne de refonte "Refonte et centralisation de Bellaïa").
--
-- Choix de modélisation (V1, volontairement simple — à affiner) :
--   - cible à 4 valeurs : 'tous' (visible même sans compte),
--     'clientes' (toute cliente connectée), 'hotesses' (hôtesses BSH
--     actives), 'fondatrice' (brouillon interne, jamais public).
--   - Pas de ciblage fin Cercle/Lounge dans cette première version :
--     ces deux espaces restent gérés manuellement par WhatsApp
--     (règle en vigueur depuis le début de ce chantier) — rien ici
--     n'automatise une admission ou une communication de community
--     management propre à l'un des deux. À affiner si besoin réel.
--   - Un brouillon (statut='brouillon') n'est jamais lisible hors de
--     la fondatrice, quelle que soit sa cible.
--
-- Impact : entièrement additif.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bsh_communications (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null,
  contenu       text not null,
  type          text not null default 'annonce' check (type in ('annonce','notification','publication')),
  cible         text not null default 'tous' check (cible in ('tous','clientes','hotesses','fondatrice')),
  statut        text not null default 'brouillon' check (statut in ('brouillon','publie','archive')),
  created_at    timestamptz not null default now(),
  publiee_le    timestamptz
);

comment on table public.bsh_communications is
  'Annonces/publications/notifications BSH — gérées par la fondatrice, lues selon la cible et le statut.';

alter table public.bsh_communications enable row level security;

drop policy if exists bsh_communications_fondatrice on public.bsh_communications;
create policy bsh_communications_fondatrice on public.bsh_communications
  for all to public
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

drop policy if exists bsh_communications_publiques on public.bsh_communications;
create policy bsh_communications_publiques on public.bsh_communications
  for select to anon, authenticated
  using (statut = 'publie' and cible = 'tous');

drop policy if exists bsh_communications_clientes on public.bsh_communications;
create policy bsh_communications_clientes on public.bsh_communications
  for select to authenticated
  using (statut = 'publie' and cible = 'clientes');

drop policy if exists bsh_communications_hotesses on public.bsh_communications;
create policy bsh_communications_hotesses on public.bsh_communications
  for select to authenticated
  using (statut = 'publie' and cible = 'hotesses' and public.est_hote_bsh());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select tablename, policyname, cmd, roles, permissive
--   from pg_policies where tablename='bsh_communications'
--   order by policyname;
--   → attendu : 4 lignes, toutes permissive = true.
--
--   select to_regclass('public.bsh_communications');
--   → attendu : non nul.
-- ═══════════════════════════════════════════════════════════
