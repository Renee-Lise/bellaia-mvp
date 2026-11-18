-- ═══════════════════════════════════════════════════════════
-- 0109_editions_registre_lexique.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18 (schéma seul)
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : une seule source éditoriale pour Le P'tit Lion, Ti-Colibri et
--   les ebooks (collection parentale…).
--   • histoires_tomes.espace : 'jeunesse' (Mo Ti-Péyi, familles) ou
--     'editions' (ebooks adultes, jamais montrés dans l'espace enfants).
--   • histoires_tomes.serie, titres_reperes : regroupement et variantes de
--     titres (ex. les deux pistes du tome 1 de Ti-Colibri).
--   • histoires_scenes.image_chemin / image_alt : illustration par page
--     ou double page (albums), texte alternatif obligatoire à la lecture.
--   • editions_ressources : registre des pièces (identifiant stable, nom
--     d'origine, type, tome, provenance, empreinte SHA-256, preuve,
--     statut de publication, fichier déposé, trace de validation).
--   • editions_lexique : lexique (créole guyanais…) avec source, tome de
--     première apparition, réemplois et statut de validation.
-- Les fonctions publiques ne renvoient plus que l'espace 'jeunesse'.
-- Contenus (titres, textes) importés en base, hors dépôt public.
-- Non destructif : ajouts de colonnes, tables, remplacement de fonctions.
-- ═══════════════════════════════════════════════════════════
alter table public.histoires_tomes add column if not exists espace text not null default 'jeunesse',
  add column if not exists serie text, add column if not exists titres_reperes text[] not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'histoires_tomes_espace_check') then
    alter table public.histoires_tomes add constraint histoires_tomes_espace_check check (espace in ('jeunesse', 'editions'));
  end if;
end $$;
alter table public.histoires_scenes add column if not exists image_chemin text, add column if not exists image_alt text;

create table if not exists public.editions_ressources (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  identifiant text not null,
  tome int, scene text,
  type text not null,                -- couverture, double_page, quatrieme, illustration, manuscrit, fiche_pedagogique, lexique, apercu_cahier, cahier, integration…
  nom_original text, niveau text, version text,
  provenance text, emplacement_source text,
  octets bigint, sha256 text,
  preuve text not null default 'a_retrouver' check (preuve in ('fichier_joint', 'trace_historique', 'a_retrouver')),
  publication text not null default 'brouillon' check (publication in ('brouillon', 'a_relire', 'approuve', 'publie')),
  stockage_chemin text,             -- fichier déposé dans le bucket privé histoires-medias
  validation jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (collection, identifiant)
);
create table if not exists public.editions_lexique (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  langue text not null default 'créole guyanais',
  entree text not null, francais text not null,
  tome_premiere int, reemplois int[] not null default '{}',
  exemple text, source text, rubrique text, variante text,
  statut text not null default 'candidat' check (statut in ('candidat', 'atteste', 'relu', 'approuve')),
  note text, historique jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (collection, entree)
);
alter table public.editions_ressources enable row level security;
alter table public.editions_lexique enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'editions_ressources' and policyname = 'editions_ressources_fondatrice') then
    create policy editions_ressources_fondatrice on public.editions_ressources for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'editions_lexique' and policyname = 'editions_lexique_fondatrice') then
    create policy editions_lexique_fondatrice on public.editions_lexique for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- Lecture publique : espace jeunesse uniquement ; illustrations exposées seulement pour un tome publié
create or replace function public.histoires_catalogue() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'collection', t.collection, 'collection_titre', t.collection_titre, 'volume', t.volume, 'numero', t.numero,
    'identifiant', t.identifiant, 'titre', t.titre, 'synopsis', t.synopsis,
    'nb_scenes', (select count(*) from public.histoires_scenes s where s.tome_id = t.id),
    'couverture', case when t.couverture_etat = 'publie' then jsonb_build_object('chemin', t.couverture_chemin, 'alt', t.couverture_alt) end,
    'audio', case when t.audio_etat = 'publie' then jsonb_build_object('chemin', t.audio_chemin, 'duree_s', t.audio_duree_s, 'reperes', t.audio_reperes) end,
    'video', case when t.video_etat = 'publie' then jsonb_build_object('chemin', t.video_chemin, 'affiche', t.video_affiche_chemin, 'vtt', t.video_vtt_chemin, 'duree_s', t.video_duree_s) end
  ) order by t.collection, t.volume, t.numero), '[]'::jsonb)
  from public.histoires_tomes t
  where t.publie and t.etat_editorial = 'valide' and t.espace = 'jeunesse';
$$;
create or replace function public.histoire_lecture(p_collection text, p_identifiant text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'identifiant', t.identifiant, 'titre', t.titre, 'numero', t.numero, 'collection_titre', t.collection_titre,
    'scenes', (select coalesce(jsonb_agg(jsonb_build_object('identifiant', s.identifiant, 'ordre', s.ordre, 'texte', s.texte, 'image', s.image_chemin, 'image_alt', s.image_alt) order by s.ordre), '[]'::jsonb) from public.histoires_scenes s where s.tome_id = t.id)
  )
  from public.histoires_tomes t
  where t.collection = p_collection and t.identifiant = p_identifiant and t.publie and t.etat_editorial = 'valide' and t.espace = 'jeunesse';
$$;
create or replace function public.histoires_media_public(p_chemin text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.histoires_tomes t where t.publie and t.etat_editorial = 'valide' and t.espace = 'jeunesse' and (
    (t.couverture_etat = 'publie' and t.couverture_chemin = p_chemin)
    or (t.audio_etat = 'publie' and t.audio_chemin = p_chemin)
    or (t.video_etat = 'publie' and p_chemin in (t.video_chemin, t.video_affiche_chemin, t.video_vtt_chemin))
    or exists (select 1 from public.histoires_scenes s where s.tome_id = t.id and s.image_chemin = p_chemin)));
$$;
