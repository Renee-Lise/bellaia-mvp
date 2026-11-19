-- ═══════════════════════════════════════════════════════════
-- 0130_editions_pedagogiques.sql
-- STATUT: PRÉPARÉE — NON APPLIQUÉE (accord de la fondatrice requis)
-- Auteur : Claude Code · Date de rédaction : 2026-11-19
-- Objet : éditeur de livres Mo Ti-Péyi / Ti-Colibri (Éditions pédagogiques).
--   • Pages (histoires_scenes) : texte créole DISTINCT, traductions,
--     légende, statut par page, numéro de version, illustration liée.
--   • Historique : chaque modification archive l'état précédent
--     (aucun texte retrouvé n'est jamais écrasé sans trace ; restauration possible).
--   • Médiathèque : statut de tri des illustrations (à identifier / à corriger /
--     en attente / validé / archivé) et variante.
--   • Fiches pédagogiques : cycle 1 / cycle 2, enseignant / élève / évaluation /
--     corrigé / lexique / prolongement, présentation classique / premium.
-- Additive : ajoute des colonnes avec valeurs par défaut et deux tables ;
--   ne modifie ni ne supprime aucune donnée. Retour arrière :
--   rollback/0130_editions_pedagogiques_rollback.sql.
-- Le dépôt est public : AUCUN texte d'ouvrage dans ce fichier.
-- ═══════════════════════════════════════════════════════════

-- ── Pages : champs de l'éditeur ────────────────────────────
alter table public.histoires_scenes add column if not exists texte_creole text;
alter table public.histoires_scenes add column if not exists traductions jsonb not null default '{}'::jsonb;   -- {"en": "...", "es": "..."}
alter table public.histoires_scenes add column if not exists legende text;
alter table public.histoires_scenes add column if not exists statut text not null default 'a_ecrire';
alter table public.histoires_scenes add column if not exists version int not null default 1;
alter table public.histoires_scenes add column if not exists illustration_ressource text;                   -- identifiant dans editions_ressources
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'histoires_scenes_statut_check') then
    alter table public.histoires_scenes add constraint histoires_scenes_statut_check check (statut in ('a_ecrire', 'brouillon', 'a_relire', 'valide'));
  end if;
end $$;

-- ── Historique des versions de pages ───────────────────────
create table if not exists public.histoires_scenes_versions (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.histoires_scenes(id) on delete cascade,
  version int not null,
  titre text, texte text, texte_creole text, traductions jsonb, legende text, statut text,
  auteur uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (scene_id, version)
);

create or replace function public.histoires_versionner_scene() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.texte, new.titre, new.texte_creole, new.traductions, new.legende) is distinct from (old.texte, old.titre, old.texte_creole, old.traductions, old.legende) then
    insert into public.histoires_scenes_versions (scene_id, version, titre, texte, texte_creole, traductions, legende, statut)
    values (old.id, old.version, old.titre, old.texte, old.texte_creole, old.traductions, old.legende, old.statut)
    on conflict (scene_id, version) do nothing;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists histoires_versionner_scene on public.histoires_scenes;
create trigger histoires_versionner_scene before update on public.histoires_scenes for each row execute function public.histoires_versionner_scene();

-- Pages existantes : statut cohérent avec leur contenu (aucun texte modifié)
update public.histoires_scenes set statut = 'brouillon' where statut = 'a_ecrire' and length(trim(coalesce(texte, ''))) > 0;

-- ── Médiathèque : tri des illustrations ────────────────────
alter table public.editions_ressources add column if not exists statut_tri text not null default 'a_identifier';
alter table public.editions_ressources add column if not exists variante text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'editions_ressources_statut_tri_check') then
    alter table public.editions_ressources add constraint editions_ressources_statut_tri_check check (statut_tri in ('a_identifier', 'a_corriger', 'en_attente', 'valide', 'archive'));
  end if;
end $$;

-- ── Fiches pédagogiques ────────────────────────────────────
create table if not exists public.editions_fiches_pedagogiques (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  tome int not null,
  cycle int not null check (cycle in (1, 2)),
  niveau text,                                             -- PS, MS, GS, CP, CE1, CE2
  public text not null check (public in ('enseignant', 'eleve', 'evaluation', 'corrige', 'lexique', 'prolongement')),
  presentation text not null default 'classique' check (presentation in ('classique', 'premium')),
  titre text,
  contenu text,
  fichier_chemin text,                                     -- PDF A4 (bucket privé), seulement après validation
  statut text not null default 'a_produire' check (statut in ('a_produire', 'brouillon', 'a_relire', 'valide')),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection, tome, cycle, public, presentation)
);

alter table public.histoires_scenes_versions enable row level security;
alter table public.editions_fiches_pedagogiques enable row level security;
do $$ begin
  drop policy if exists histoires_scenes_versions_fondatrice on public.histoires_scenes_versions;
  create policy histoires_scenes_versions_fondatrice on public.histoires_scenes_versions for select to authenticated using (public.is_fondatrice());
  drop policy if exists editions_fiches_fondatrice on public.editions_fiches_pedagogiques;
  create policy editions_fiches_fondatrice on public.editions_fiches_pedagogiques for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
end $$;
revoke all on public.histoires_scenes_versions, public.editions_fiches_pedagogiques from anon;
