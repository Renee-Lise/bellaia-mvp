-- Empreinte de structure indépendante de la mise en forme : une ligne par objet (type | nom | empreinte du contenu normalisé)
select 'fonction', p.oid::regprocedure::text, md5(regexp_replace(lower(p.prosrc), '\s+', '', 'g') || coalesce(array_to_string(p.proconfig, ','), '') || p.prosecdef::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','storage') and p.prokind = 'f'
union all select 'politique', schemaname || '.' || tablename || '.' || policyname, md5(regexp_replace(lower(coalesce(qual,'') || '|' || coalesce(with_check,'') || cmd || permissive || array_to_string(roles, ',')), '\s+', '', 'g'))
  from pg_policies where schemaname in ('public','storage')
union all select 'colonne', table_schema || '.' || table_name || '.' || column_name, md5(data_type || coalesce(column_default,'') || is_nullable)
  from information_schema.columns where table_schema in ('public','storage','auth')
union all select 'index', schemaname || '.' || indexname, md5(indexdef) from pg_indexes where schemaname in ('public','storage')
union all select 'contrainte', conrelid::regclass::text || '.' || conname, md5(pg_get_constraintdef(oid)) from pg_constraint where connamespace in ('public'::regnamespace, 'storage'::regnamespace)
union all select 'declencheur', tgrelid::regclass::text || '.' || tgname, md5(pg_get_triggerdef(oid)) from pg_trigger where not tgisinternal
union all select 'vue', c.oid::regclass::text, md5(regexp_replace(lower(pg_get_viewdef(c.oid)), '\s+', '', 'g')) from pg_class c where c.relkind = 'v' and c.relnamespace = 'public'::regnamespace
union all select 'rls', c.oid::regclass::text, c.relrowsecurity::text from pg_class c where c.relkind = 'r' and c.relnamespace = 'public'::regnamespace
union all select 'droit', table_schema || '.' || table_name || '.' || grantee || '.' || privilege_type, '1' from information_schema.role_table_grants where table_schema in ('public','storage') and grantee in ('anon','authenticated')
order by 1, 2;
