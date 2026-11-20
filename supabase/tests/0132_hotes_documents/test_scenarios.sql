-- Scénarios (exécutés après la migration). Chaque ligne affiche OK ou ÉCHEC.
create or replace function pg_temp.essai(sub text, q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true); execute 'set local role authenticated'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
\set H1 '00000000-0000-0000-0000-00000000000a'
\set H2 '00000000-0000-0000-0000-00000000000b'
select '1 hôte dépose dans son dossier pour un document demandé' t, pg_temp.essai(:'H1', $q$insert into storage.objects(bucket_id,name) values ('equipe-prive','hotes/10000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/id.pdf')$q$) = 'accepté' ok
union all select '2 dépôt dans le dossier d''un autre hôte refusé', pg_temp.essai(:'H1', $q$insert into storage.objects(bucket_id,name) values ('equipe-prive','hotes/10000000-0000-0000-0000-00000000000b/20000000-0000-0000-0000-000000000003/x.pdf')$q$) = 'refusé'
union all select '3 dépôt pour un document déjà validé refusé', pg_temp.essai(:'H1', $q$insert into storage.objects(bucket_id,name) values ('equipe-prive','hotes/10000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000002/x.pdf')$q$) = 'refusé'
union all select '4 dépôt hors dossier hôtes refusé', pg_temp.essai(:'H1', $q$insert into storage.objects(bucket_id,name) values ('equipe-prive','missions/x/y.pdf')$q$) = 'refusé'
union all select '5 personne non hôte refusée', pg_temp.essai('00000000-0000-0000-0000-0000000000cc', $q$insert into storage.objects(bucket_id,name) values ('equipe-prive','hotes/10000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/z.pdf')$q$) = 'refusé'
union all select '6 enregistrement du dépôt par l''hôte', pg_temp.essai(:'H1', $q$select public.bsh_hote_document_depose('20000000-0000-0000-0000-000000000001','hotes/10000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/id.pdf')$q$) = 'accepté';
select '7 statut passé à « reçu » avec chemin', (select statut = 'recu' and storage_path like 'hotes/%' from public.bsh_hotes_documents where id = '20000000-0000-0000-0000-000000000001')
union all select '8 second dépôt sur un document reçu refusé', pg_temp.essai(:'H1', $q$select public.bsh_hote_document_depose('20000000-0000-0000-0000-000000000001','hotes/10000000-0000-0000-0000-00000000000a/20000000-0000-0000-0000-000000000001/id.pdf')$q$) = 'refusé'
union all select '9 enregistrer le document d''un autre hôte refusé', pg_temp.essai(:'H1', $q$select public.bsh_hote_document_depose('20000000-0000-0000-0000-000000000003','hotes/10000000-0000-0000-0000-00000000000b/20000000-0000-0000-0000-000000000003/x.pdf')$q$) = 'refusé'
union all select '10 chemin sans fichier réellement reçu refusé', pg_temp.essai(:'H2', $q$select public.bsh_hote_document_depose('20000000-0000-0000-0000-000000000003','hotes/10000000-0000-0000-0000-00000000000b/20000000-0000-0000-0000-000000000003/absent.pdf')$q$) = 'refusé'
union all select '11 chemin avec ../ refusé', pg_temp.essai(:'H2', $q$select public.bsh_hote_document_depose('20000000-0000-0000-0000-000000000003','hotes/10000000-0000-0000-0000-00000000000b/20000000-0000-0000-0000-000000000003/../x.pdf')$q$) = 'refusé';
