-- ═══════════════════════════════════════════════════════════
-- 0083_events_visuels_decoration.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-10
-- Objet : demande explicite de Renée-Lise — "visuels de décoration"
--   pour Bella'Events, réponse "Les deux" (ses propres photos +
--   génération IA en complément). Cette migration couvre le premier
--   volet : une bibliothèque de ses propres photos de décoration,
--   taguées par occasion/thème, qu'elle alimente elle-même et que le
--   compositeur "Programme à thème" propose ensuite au bon moment.
--   Le second volet (génération d'images par IA) nécessite un
--   fournisseur et un budget encore à valider avec elle — pas
--   construit ici.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.events_visuels_decoration (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  occasion text,
  theme text,
  image_url text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events_visuels_decoration enable row level security;

drop policy if exists events_visuels_decoration_fondatrice on public.events_visuels_decoration;
create policy events_visuels_decoration_fondatrice on public.events_visuels_decoration
  for all to authenticated
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.events_visuels_decoration');
--   → attendu : non nul.
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='events_visuels_decoration';
--   → attendu : 1 ligne (events_visuels_decoration_fondatrice, ALL).
-- ═══════════════════════════════════════════════════════════
