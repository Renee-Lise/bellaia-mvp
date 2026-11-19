-- Retour arrière de 0130_editions_pedagogiques.sql (sur décision de la fondatrice uniquement).
-- ⚠️ Supprime l'historique des versions de pages et les fiches pédagogiques, ainsi que les
--   champs créole / traductions / légende / statut / version des pages. Exporter avant.
--   Les textes français des pages (colonne texte) ne sont pas touchés.
drop trigger if exists histoires_versionner_scene on public.histoires_scenes;
drop function if exists public.histoires_versionner_scene();
drop table if exists public.histoires_scenes_versions, public.editions_fiches_pedagogiques;
alter table public.histoires_scenes drop constraint if exists histoires_scenes_statut_check;
alter table public.histoires_scenes drop column if exists texte_creole, drop column if exists traductions, drop column if exists legende,
  drop column if exists statut, drop column if exists version, drop column if exists illustration_ressource;
alter table public.editions_ressources drop constraint if exists editions_ressources_statut_tri_check;
alter table public.editions_ressources drop column if exists statut_tri, drop column if exists variante;
