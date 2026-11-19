-- Retour arrière de 0129_bsh_secret_stories.sql
-- ⚠️ À n'exécuter QUE sur décision de la fondatrice : supprime les tables
--   Secret Stories et TOUT leur contenu (manuscrits, achats, abonnements).
--   Exporter les données avant toute exécution. N'affecte aucune autre table.
--   Les fichiers du bucket « secret-stories-prive » ne sont PAS supprimés
--   (à vider manuellement dans Storage si nécessaire, puis supprimer le bucket).
drop policy if exists ss_fichiers_lecture on storage.objects;
drop policy if exists ss_fichiers_ecriture on storage.objects;
drop policy if exists ss_fichiers_maj on storage.objects;
drop policy if exists ss_fichiers_suppression on storage.objects;
drop function if exists public.ss_catalogue(), public.ss_mes_fichiers(uuid), public.ss_extrait(uuid), public.ss_lire_chapitre(uuid, int), public.ss_ma_bibliotheque(),
  public.ss_fichier_autorise(text), public.ss_a_droit(uuid, text), public.ss_droits_de(uuid), public.ss_oeuvre_visible(uuid);
drop table if exists public.ss_lecture, public.ss_achats, public.ss_abonnements, public.ss_formules_contenus, public.ss_formules, public.ss_codes_promo,
  public.ss_offres, public.ss_generations, public.ss_quotas, public.ss_voix_autorisations, public.ss_fichiers, public.ss_extraits, public.ss_chronologie,
  public.ss_personnages, public.ss_chapitres_versions, public.ss_chapitres, public.ss_oeuvres, public.ss_collections cascade;
drop function if exists public.ss_garde_publication(), public.ss_versionner_chapitre(), public.ss_garde_commerce(), public.ss_garde_generation(),
  public.ss_est_adulte(), public.ss_studio();
