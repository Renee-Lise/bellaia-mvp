-- ═══════════════════════════════════════════════════════════
-- 0056_food_recettes_media.sql
-- STATUT: VALIDÉ (exécutée et vérifiée le 30/10/2026)
-- Auteur : Claude Code · Date de rédaction : 2026-10-30
-- Objet : upload réel de photos/vidéos sur une fiche recette, demandé
--   par Renée-Lise ("ajouter des liens, vidéos, photos de recettes").
--   Jusqu'ici le champ "photo" n'acceptait qu'un lien déjà hébergé
--   ailleurs, collé à la main — aucun upload direct depuis le
--   téléphone, et pas de galerie/vidéo affichées à l'écran.
--
-- 1) Colonnes "photo"/"galerie"/"video" sur food_recettes : déjà lues
--    et écrites par l'API (mapRecetteFromDb/mapRecetteToDb) depuis
--    une précédente session, mais jamais garanties par une migration
--    tracée ici (la table food_recettes elle-même préexiste, créée
--    avant le suivi par migrations). "add column if not exists" :
--    aucun risque si elles existent déjà, les crée sinon.
--
-- 2) Bucket Storage dédié "food-recettes-media" : même schéma que
--    stocks-images (migration 0007) — lecture publique au niveau du
--    fichier (nom de fichier horodaté, non énumérable), écriture
--    réservée à la fondatrice via is_fondatrice() (et non
--    est_staff_bellaia(), car food_recettes est déjà fondatrice-seule
--    depuis la migration 0049 — même périmètre ici). Un bucket séparé
--    plutôt que de réutiliser stocks-images : ce sont des photos de
--    recettes, pas des photos de produits en stock.
--
-- Impact : entièrement additif. Aucune donnée existante touchée.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. Colonnes médias sur food_recettes
-- ───────────────────────────────────────────────────────────
alter table public.food_recettes
  add column if not exists photo   text,
  add column if not exists galerie jsonb not null default '[]'::jsonb,
  add column if not exists video   text;

comment on column public.food_recettes.photo is
  'URL publique de la photo principale (bucket food-recettes-media). NULL si aucune photo.';
comment on column public.food_recettes.galerie is
  'Tableau jsonb d''URLs — photos supplémentaires de la recette.';
comment on column public.food_recettes.video is
  'URL publique de la vidéo (bucket food-recettes-media) ou lien externe. NULL si aucune vidéo.';

-- ───────────────────────────────────────────────────────────
-- 2. Bucket Storage — lecture publique, écriture fondatrice
-- ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('food-recettes-media', 'food-recettes-media', true)
on conflict (id) do nothing;

drop policy if exists "food_recettes_media_lecture_publique" on storage.objects;
create policy "food_recettes_media_lecture_publique" on storage.objects
  for select
  using (bucket_id = 'food-recettes-media');

drop policy if exists "food_recettes_media_ajout_fondatrice" on storage.objects;
create policy "food_recettes_media_ajout_fondatrice" on storage.objects
  for insert
  with check (bucket_id = 'food-recettes-media' and public.is_fondatrice());

drop policy if exists "food_recettes_media_modif_fondatrice" on storage.objects;
create policy "food_recettes_media_modif_fondatrice" on storage.objects
  for update
  using (bucket_id = 'food-recettes-media' and public.is_fondatrice());

drop policy if exists "food_recettes_media_suppression_fondatrice" on storage.objects;
create policy "food_recettes_media_suppression_fondatrice" on storage.objects
  for delete
  using (bucket_id = 'food-recettes-media' and public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='food_recettes'
--     and column_name in ('photo','galerie','video');
--   → attendu : 3 lignes (photo, galerie, video).
--
--   select id, public from storage.buckets where id = 'food-recettes-media';
--   → attendu : 1 ligne, public = true.
--
--   select count(*) from pg_policies
--   where schemaname='storage' and tablename='objects'
--     and policyname like 'food_recettes_media_%';
--   → attendu : 4.
-- ═══════════════════════════════════════════════════════════
