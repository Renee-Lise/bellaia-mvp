-- Scénarios de la migration 0130 (exécutés après la migration). t = réussi.
create or replace function pg_temp.essai(sub text, q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
create or replace function pg_temp.compte(sub text, q text) returns int language plpgsql as $$
declare n int; begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q into n; execute 'reset role'; return n;
exception when others then execute 'reset role'; return -1; end $$;
create or replace function pg_temp.anon(q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', '{}', true); execute 'set local role anon'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
\set F '00000000-0000-0000-0000-0000000000f1'
\set A '00000000-0000-0000-0000-0000000000a1'
\set P1 '30000000-0000-0000-0000-000000000001'
select '1 pages existantes avec texte → brouillon, page vide → à écrire' t, (select bool_and(case when identifiant = 'T1-P3' then statut = 'a_ecrire' else statut = 'brouillon' end) from public.histoires_scenes) ok
union all select '2 aucun texte existant modifié', (select count(*) = 2 from public.histoires_scenes where texte like 'Texte fictif%')
union all select '3 version 1 pour toutes les pages', (select bool_and(version = 1) from public.histoires_scenes)
union all select '4 ressources existantes « à identifier », version d''origine conservée', (select bool_and(statut_tri = 'a_identifier') and count(*) filter (where version = 'v1') = 1 from public.editions_ressources);
select '5 la fondatrice modifie le texte d''une page' t, pg_temp.essai(:'F', format($q$update public.histoires_scenes set texte = 'Texte corrigé.' where id = %L$q$, :'P1')) = 'accepté' ok;
select '6 l''ancien texte est archivé (version 1) et la page passe en version 2' t, (select v.texte = 'Texte fictif de la page un.' and s.version = 2 from public.histoires_scenes_versions v join public.histoires_scenes s on s.id = v.scene_id where v.scene_id = :'P1' and v.version = 1) ok
union all select '7 l''auteur de l''archive est enregistré', (select auteur = :'F' from public.histoires_scenes_versions where scene_id = :'P1' and version = 1);
select '8 changer seulement l''ordre ne crée pas de version' t, pg_temp.essai(:'F', format($q$update public.histoires_scenes set ordre = 9 where id = %L$q$, :'P1')) = 'accepté' ok;
select '9 toujours version 2, une seule archive' t, (select version = 2 from public.histoires_scenes where id = :'P1') and (select count(*) = 1 from public.histoires_scenes_versions where scene_id = :'P1') ok;
select '10 deuxième correction (créole)' t, pg_temp.essai(:'F', format($q$update public.histoires_scenes set texte_creole = 'Tèks kréyòl fiktif.' where id = %L$q$, :'P1')) = 'accepté' ok;
select '11 version 3, deux archives, restauration possible de la version 1' t, (select version = 3 from public.histoires_scenes where id = :'P1') and (select count(*) = 2 from public.histoires_scenes_versions where scene_id = :'P1') ok
union all select '12 statut de page invalide refusé', pg_temp.essai(:'F', format($q$update public.histoires_scenes set statut = 'publie' where id = %L$q$, :'P1')) = 'refusé'
union all select '13 statut de tri invalide refusé', pg_temp.essai(:'F', $q$update public.editions_ressources set statut_tri = 'n_importe' $q$) = 'refusé'
union all select '14 fiche pédagogique créée par la fondatrice', pg_temp.essai(:'F', $q$insert into public.editions_fiches_pedagogiques (collection, tome, cycle, public) values ('Ti-Colibri', 1, 1, 'enseignant')$q$) = 'accepté'
union all select '15 doublon de fiche refusé', pg_temp.essai(:'F', $q$insert into public.editions_fiches_pedagogiques (collection, tome, cycle, public) values ('Ti-Colibri', 1, 1, 'enseignant')$q$) = 'refusé'
union all select '16 cycle 3 refusé', pg_temp.essai(:'F', $q$insert into public.editions_fiches_pedagogiques (collection, tome, cycle, public) values ('Ti-Colibri', 2, 3, 'eleve')$q$) = 'refusé'
union all select '17 assistante : création de fiche refusée', pg_temp.essai(:'A', $q$insert into public.editions_fiches_pedagogiques (collection, tome, cycle, public) values ('Ti-Colibri', 3, 1, 'eleve')$q$) = 'refusé'
union all select '18 assistante : historique des pages invisible', pg_temp.compte(:'A', 'select count(*) from public.histoires_scenes_versions') = 0
union all select '19 assistante : ne peut pas écrire dans l''historique', pg_temp.essai(:'A', format($q$insert into public.histoires_scenes_versions (scene_id, version) values (%L, 99)$q$, :'P1')) = 'refusé'
union all select '20 visiteur non connecté : fiches et historique refusés', pg_temp.anon('select * from public.editions_fiches_pedagogiques') = 'refusé' and pg_temp.anon('select * from public.histoires_scenes_versions') = 'refusé';
