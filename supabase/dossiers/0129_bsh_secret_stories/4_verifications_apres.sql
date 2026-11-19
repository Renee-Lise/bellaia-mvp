-- 0129 — VÉRIFICATIONS APRÈS (lecture seule). Chaque ligne doit afficher « OK ».
with t as (select array['ss_collections','ss_oeuvres','ss_chapitres','ss_chapitres_versions','ss_personnages','ss_chronologie','ss_extraits','ss_fichiers','ss_offres','ss_codes_promo','ss_formules','ss_formules_contenus','ss_achats','ss_abonnements','ss_lecture','ss_generations','ss_quotas','ss_voix_autorisations'] as l)
select '18 tables créées' as controle, case when (select count(*) from pg_tables, t where schemaname = 'public' and tablename = any(t.l)) = 18 then 'OK' else 'INCOMPLET' end as resultat
union all select 'RLS active sur les 18 tables', case when (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace, t where n.nspname = 'public' and c.relname = any(t.l) and c.relrowsecurity) = 18 then 'OK' else 'RLS MANQUANTE' end
union all select 'aucun droit anonyme sur les tables ss_*', case when not exists (select 1 from information_schema.role_table_grants where grantee = 'anon' and table_name like 'ss\_%') then 'OK' else 'DROIT ANONYME PRÉSENT' end
union all select 'fonctions clientes (8)', case when (select count(distinct proname) from pg_proc where proname in ('ss_studio','ss_est_adulte','ss_catalogue','ss_extrait','ss_lire_chapitre','ss_ma_bibliotheque','ss_mes_fichiers','ss_fichier_autorise')) = 8 then 'OK' else 'MANQUANTE' end
union all select 'ss_droits_de non exécutable par les clientes', case when not has_function_privilege('authenticated', 'public.ss_droits_de(uuid)', 'execute') then 'OK' else 'EXPOSÉE' end
union all select 'garde-fous (5 déclencheurs)', case when (select count(*) from pg_trigger where tgname in ('ss_garde_publication','ss_versionner_chapitre','ss_garde_achats','ss_garde_abonnements','ss_garde_generation')) = 5 then 'OK' else 'MANQUANT' end
union all select 'bucket privé', case when exists (select 1 from storage.buckets where id = 'secret-stories-prive' and public = false) then 'OK' else 'ABSENT OU PUBLIC' end
union all select 'politiques du bucket (4)', case when (select count(*) from pg_policies where tablename = 'objects' and policyname like 'ss\_fichiers\_%') = 4 then 'OK' else 'INCOMPLET' end
union all select 'quota IA à zéro (aucune ligne)', case when not exists (select 1 from public.ss_quotas where plafond_centimes > 0) then 'OK' else 'QUOTA DÉFINI' end
union all select 'aucune permission studio accordée', case when not exists (select 1 from public.bellaia_permissions where permission = 'secret_stories.studio') then 'OK' else 'ATTENTION' end
union all select 'migration 0128 intacte (bsh_hotes_candidatures)', case when to_regclass('public.bsh_hotes_candidatures') is not null then 'OK' else 'ANOMALIE' end;

-- Photographie : doit être IDENTIQUE à celle prise avant
select 'profils' as quoi, count(*) as nombre from public.profiles
union all select 'permissions', count(*) from public.bellaia_permissions
union all select 'hôtes BSH', count(*) from public.bsh_hotes
union all select 'commandes', count(*) from public.bellaia_commandes;
