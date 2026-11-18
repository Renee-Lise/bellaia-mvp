-- ═══════════════════════════════════════════════════════════
-- 0107_histoires_du_soir.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18 (schéma seul)
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : « Histoires du soir » (espace jeunesse Mo Ti-Péyi), première
--   collection « Le P'tit Lion ». Consigne fondatrice du 18/11.
--
-- ⚠️ Le dépôt GitHub est PUBLIC : AUCUN texte, titre non publié ni média
--   n'est dans ce fichier ni dans le code. Les contenus sont importés
--   directement dans la base (import idempotent par identifiants stables :
--   on conflict do nothing), hors dépôt.
--
-- Sécurité :
--   • Tables lisibles et modifiables par la fondatrice seule (RLS).
--   • Familles / visiteurs : uniquement via les fonctions
--     histoires_catalogue() et histoire_lecture(), qui ne renvoient QUE les
--     tomes publiés, sans titres techniques de scènes ni mise en scène, et
--     n'exposent un média que s'il est lui-même publié.
--   • Un brouillon n'est jamais renvoyé, même par identifiant direct.
--   • Bucket « histoires-medias » PRIVÉ : un fichier n'est lisible (URL
--     signée) que par la fondatrice, ou par tous s'il est le média publié
--     d'un tome publié.
--   • Contraintes : pas de publication sans texte validé ; pas de média
--     publié sans fichier et sans durée réelle ; vidéo publiée = MP4 +
--     affiche + WebVTT ; couverture publiée = texte alternatif obligatoire.
-- Non destructif : création uniquement (if not exists).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.histoires_tomes (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  collection_titre text not null,
  volume int not null default 1,
  numero int not null,
  identifiant text not null,
  titre text not null,
  synopsis text,
  etat_editorial text not null default 'a_ecrire' check (etat_editorial in ('a_ecrire', 'brouillon', 'texte_fourni', 'valide')),
  publie boolean not null default false,
  couverture_chemin text, couverture_alt text,
  couverture_etat text not null default 'absent' check (couverture_etat in ('absent', 'brouillon', 'revision', 'publie')),
  audio_chemin text, audio_duree_s numeric,
  audio_etat text not null default 'absent' check (audio_etat in ('absent', 'brouillon', 'revision', 'publie')),
  audio_reperes jsonb not null default '[]'::jsonb, -- [{ "scene": "<identifiant>", "debut_s": 0 }] — minutage réel uniquement
  video_chemin text, video_affiche_chemin text, video_vtt_chemin text, video_duree_s numeric,
  video_etat text not null default 'absent' check (video_etat in ('absent', 'brouillon', 'revision', 'publie')),
  notes_fondatrice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection, identifiant),
  unique (collection, numero),
  constraint histoires_publie_si_valide check (not publie or etat_editorial = 'valide'),
  constraint histoires_audio_publie check (audio_etat <> 'publie' or (audio_chemin is not null and audio_duree_s > 0)),
  constraint histoires_video_publie check (video_etat <> 'publie' or (video_chemin is not null and video_affiche_chemin is not null and video_vtt_chemin is not null and video_duree_s > 0)),
  constraint histoires_couverture_publie check (couverture_etat <> 'publie' or (couverture_chemin is not null and coalesce(couverture_alt, '') <> ''))
);

create table if not exists public.histoires_scenes (
  id uuid primary key default gen_random_uuid(),
  tome_id uuid not null references public.histoires_tomes(id) on delete cascade,
  identifiant text not null,
  ordre int not null,
  titre text not null default '',        -- métadonnée (jamais lue à voix haute, jamais montrée aux familles)
  mise_en_scene text,                    -- métadonnée de production
  texte text not null default '',        -- seul texte à lire / enregistrer
  updated_at timestamptz not null default now(),
  unique (tome_id, identifiant)
);
create index if not exists histoires_scenes_tome_ordre_idx on public.histoires_scenes(tome_id, ordre);

-- Validation éditoriale : un tome ne passe « validé » que s'il a des scènes avec du texte.
create or replace function public.histoires_controle_validation() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.etat_editorial = 'valide' and not exists (select 1 from public.histoires_scenes s where s.tome_id = new.id and length(trim(s.texte)) > 0) then
    raise exception 'Impossible de valider « % » : aucun texte de scène.', new.titre;
  end if;
  new.updated_at := now();
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'histoires_tomes_validation') then
    create trigger histoires_tomes_validation before insert or update on public.histoires_tomes for each row execute function public.histoires_controle_validation();
  end if;
end $$;

alter table public.histoires_tomes enable row level security;
alter table public.histoires_scenes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'histoires_tomes' and policyname = 'histoires_tomes_fondatrice') then
    create policy histoires_tomes_fondatrice on public.histoires_tomes for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'histoires_scenes' and policyname = 'histoires_scenes_fondatrice') then
    create policy histoires_scenes_fondatrice on public.histoires_scenes for all to authenticated using (public.is_fondatrice()) with check (public.is_fondatrice());
  end if;
end $$;

-- ── Lecture publique : tomes publiés seulement ─────────────
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
  where t.publie and t.etat_editorial = 'valide';
$$;

create or replace function public.histoire_lecture(p_collection text, p_identifiant text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'identifiant', t.identifiant, 'titre', t.titre, 'numero', t.numero, 'collection_titre', t.collection_titre,
    'scenes', (select coalesce(jsonb_agg(jsonb_build_object('identifiant', s.identifiant, 'ordre', s.ordre, 'texte', s.texte) order by s.ordre), '[]'::jsonb) from public.histoires_scenes s where s.tome_id = t.id)
  )
  from public.histoires_tomes t
  where t.collection = p_collection and t.identifiant = p_identifiant and t.publie and t.etat_editorial = 'valide';
$$;

-- Un fichier du bucket est public seulement s'il est le média publié d'un tome publié.
create or replace function public.histoires_media_public(p_chemin text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.histoires_tomes t where t.publie and t.etat_editorial = 'valide' and (
    (t.couverture_etat = 'publie' and t.couverture_chemin = p_chemin)
    or (t.audio_etat = 'publie' and t.audio_chemin = p_chemin)
    or (t.video_etat = 'publie' and p_chemin in (t.video_chemin, t.video_affiche_chemin, t.video_vtt_chemin))));
$$;

revoke all on function public.histoires_catalogue() from public;
revoke all on function public.histoire_lecture(text, text) from public;
revoke all on function public.histoires_media_public(text) from public;
grant execute on function public.histoires_catalogue() to anon, authenticated;
grant execute on function public.histoire_lecture(text, text) to anon, authenticated;
grant execute on function public.histoires_media_public(text) to anon, authenticated;

-- ── Bucket privé des médias ────────────────────────────────
insert into storage.buckets (id, name, public) values ('histoires-medias', 'histoires-medias', false) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'histoires_medias_lecture') then
    create policy histoires_medias_lecture on storage.objects for select to anon, authenticated
      using (bucket_id = 'histoires-medias' and (public.is_fondatrice() or public.histoires_media_public(name)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'histoires_medias_insert') then
    create policy histoires_medias_insert on storage.objects for insert to authenticated with check (bucket_id = 'histoires-medias' and public.is_fondatrice());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'histoires_medias_update') then
    create policy histoires_medias_update on storage.objects for update to authenticated using (bucket_id = 'histoires-medias' and public.is_fondatrice()) with check (bucket_id = 'histoires-medias' and public.is_fondatrice());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'histoires_medias_delete') then
    create policy histoires_medias_delete on storage.objects for delete to authenticated using (bucket_id = 'histoires-medias' and public.is_fondatrice());
  end if;
end $$;
