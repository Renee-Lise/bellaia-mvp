-- ═══════════════════════════════════════════════════════════
-- 0120_bibliotheque_fiches_techniques.sql
-- Bibliothèque professionnelle Bellaïa (fiches techniques cuisine /
-- pâtisserie) — validée par la fondatrice le 19/11/2026.
--  • bibliotheque_sources : provenance + droits d'utilisation
--    (périmètre : utilisation interne, adaptation, partage, diffusion
--    commerciale) + confirmation + justificatif (stockage privé).
--  • bibliotheque_fiches : inventaire des documents (Drive, iPhone,
--    photo, scan, Word, ZIP, texte collé), empreinte anti-doublon,
--    catégorie, statut d'import, lien vers la recette exploitable.
--  • Espaces séparés : BELLAFOOD (privé), VILDOR (privé, organisation
--    partenaire), PARTAGE (lecture par les deux, si les droits le
--    permettent). Vil'Dor n'a AUCUN accès aux fiches Bella'Food.
--  • food_recettes : rattachement à une fiche d'origine, statut
--    « a_valider » pour les recettes extraites (validation humaine),
--    variantes (recette_parente_id) sans modifier l'original.
-- Uniquement des ajouts. Aucune suppression.
-- ═══════════════════════════════════════════════════════════
create table if not exists public.bibliotheque_sources (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  type text not null default 'organisme_formation',
  perimetre text[] not null default '{}',   -- utilisation_interne | adaptation | partage | diffusion_commerciale
  confirmation text,
  confirme_le date,
  justificatif_path text,                    -- compartiment privé equipe-prive
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perimetre_valide check (perimetre <@ array['utilisation_interne','adaptation','partage','diffusion_commerciale']::text[])
);

create table if not exists public.bibliotheque_fiches (
  id uuid primary key default gen_random_uuid(),
  espace text not null default 'BELLAFOOD' check (espace in ('BELLAFOOD','VILDOR','PARTAGE')),
  organisation_id uuid references public.bellaia_organisations(id),
  titre text,
  code text,                                 -- ex. FT037
  categorie text,
  categories_extra text[] not null default '{}',
  source_id uuid references public.bibliotheque_sources(id),
  origine text not null default 'drive' check (origine in ('drive','iphone','photo','scan','word','zip','texte','pdf')),
  drive_id text unique,
  drive_url text,
  storage_path text,                         -- original conservé (privé)
  empreinte text,                            -- SHA-256 du fichier (doublons)
  statut text not null default 'a_importer' check (statut in ('a_importer','extrait','a_valider','valide','rejete','doublon')),
  recette_id uuid references public.food_recettes(id) on delete set null,
  diffusion_client boolean not null default false,  -- jamais d'original pédagogique publié sans droit
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bibliotheque_fiches_empreinte on public.bibliotheque_fiches (empreinte);
create index if not exists bibliotheque_fiches_categorie on public.bibliotheque_fiches (categorie);

alter table public.food_recettes add column if not exists fiche_id uuid references public.bibliotheque_fiches(id) on delete set null;
alter table public.food_recettes add column if not exists recette_parente_id uuid references public.food_recettes(id) on delete set null;
alter table public.food_recettes add column if not exists rendement text;
alter table public.food_recettes add column if not exists materiel text[];
alter table public.food_recettes add column if not exists validee_par uuid;
alter table public.food_recettes add column if not exists validee_le timestamptz;

alter table public.bibliotheque_sources enable row level security;
alter table public.bibliotheque_fiches enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='bibliotheque_sources' and policyname='biblio_sources_equipe') then
    create policy biblio_sources_equipe on public.bibliotheque_sources for all to authenticated
      using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
  end if;
  if not exists (select 1 from pg_policies where tablename='bibliotheque_fiches' and policyname='biblio_fiches_equipe') then
    create policy biblio_fiches_equipe on public.bibliotheque_fiches for all to authenticated
      using (public.est_staff_bellaia() or public.a_permission('bibliotheque.gerer'))
      with check (public.est_staff_bellaia() or public.a_permission('bibliotheque.gerer'));
  end if;
  -- Partenaire : uniquement les fiches de SON organisation, et le partagé en lecture.
  if not exists (select 1 from pg_policies where tablename='bibliotheque_fiches' and policyname='biblio_fiches_partenaire') then
    create policy biblio_fiches_partenaire on public.bibliotheque_fiches for all to authenticated
      using (espace = 'VILDOR' and organisation_id is not null and public.membre_organisation(organisation_id))
      with check (espace = 'VILDOR' and organisation_id is not null and public.membre_organisation(organisation_id));
  end if;
  if not exists (select 1 from pg_policies where tablename='bibliotheque_fiches' and policyname='biblio_fiches_partage_lecture') then
    create policy biblio_fiches_partage_lecture on public.bibliotheque_fiches for select to authenticated
      using (espace = 'PARTAGE' and exists (select 1 from public.bellaia_roles r where r.user_id = auth.uid() and r.statut = 'actif' and r.organisation_id is not null));
  end if;
end $$;

insert into public.bibliotheque_sources (nom, type, perimetre, confirmation, confirme_le, notes) values
 ('Massena Formations', 'organisme_formation', array['utilisation_interne','adaptation'],
  'Autorisation de réutilisation des documents Massena Formations confirmée par la fondatrice (message du 19/11/2026). Périmètre exact (partage, diffusion commerciale) à préciser avec le justificatif.',
  date '2026-11-19',
  'Fiches techniques FTxxx (pâtisserie / cuisine). Les documents pédagogiques originaux ne sont jamais publiés dans le catalogue client tant que la diffusion n''est pas couverte.')
on conflict (nom) do nothing;

-- ── Appliqué le 19/11 en plus du schéma ci-dessus ─────────────────
-- • Inventaire : 119 documents Google Drive distincts (160 liens transmis,
--   41 doublons) insérés dans bibliotheque_fiches (statut a_importer).
-- • Fonction d'import serveur biblio_importer_fiche(drive_id, json) :
--   crée la recette « a_valider » (source Massena Formations — FTxxx,
--   allergènes vides = inconnus, valorisation Massena en note indicative,
--   doublon possible signalé) et relie la fiche. Refusée hors serveur
--   (garde current_user), RLS en plus.
-- • Administration : 4 documents (2 modèles modifiables copiés dans le
--   Drive de la fondatrice, 2 guides) dans bellaia_documents
--   (module administratif, catégories outil / guide).
