-- 0129 — VÉRIFICATIONS AVANT (lecture seule : aucune modification)
-- À exécuter dans Supabase › SQL Editor AVANT la migration. Chaque ligne doit afficher « OK ».
select 'fonction is_fondatrice' as controle, case when exists (select 1 from pg_proc where proname = 'is_fondatrice') then 'OK' else 'MANQUANT' end as resultat
union all select 'fonction a_permission(p,u)', case when exists (select 1 from pg_proc where proname = 'a_permission' and pronargs = 2) then 'OK' else 'MANQUANT' end
union all select 'profiles.age_verifi', case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'age_verifi') then 'OK' else 'MANQUANT' end
union all select 'profiles.date_naissance', case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'date_naissance') then 'OK' else 'MANQUANT' end
union all select 'table bellaia_permissions', case when to_regclass('public.bellaia_permissions') is not null then 'OK' else 'MANQUANT' end
union all select 'gen_random_uuid disponible', case when exists (select 1 from pg_proc where proname = 'gen_random_uuid') then 'OK' else 'MANQUANT' end
union all select 'schéma storage', case when to_regclass('storage.objects') is not null then 'OK' else 'MANQUANT' end
union all select 'aucune table ss_* existante', case when not exists (select 1 from pg_tables where schemaname = 'public' and tablename like 'ss\_%') then 'OK' else 'DÉJÀ PRÉSENTE — ne pas relancer' end
union all select 'bucket secret-stories-prive absent', case when not exists (select 1 from storage.buckets where id = 'secret-stories-prive') then 'OK' else 'DÉJÀ PRÉSENT' end
union all select 'aucune permission secret_stories.studio accordée', case when not exists (select 1 from public.bellaia_permissions where permission = 'secret_stories.studio') then 'OK' else 'ATTENTION : permission déjà accordée' end;

-- Photographie à conserver (comparée après migration : doit être identique)
select 'profils' as quoi, count(*) as nombre from public.profiles
union all select 'permissions', count(*) from public.bellaia_permissions
union all select 'hôtes BSH', count(*) from public.bsh_hotes
union all select 'commandes', count(*) from public.bellaia_commandes;
