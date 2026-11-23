-- Scénarios joués AVANT puis APRÈS 0134. Chaque écriture est une requête distincte de sa vérification
-- (sinon la vérification lit l'instantané d'avant l'écriture). t = comportement sûr, f = faille exploitable.
-- Comptes : F fondatrice ; S titulaire de « acces_complet » ; C cliente ; X inscrit malveillant ; Y compte sans profil.
\set F '00000000-0000-0000-0000-0000000000f1'
\set S '00000000-0000-0000-0000-0000000000a5'
\set C '00000000-0000-0000-0000-0000000000c1'
\set X '00000000-0000-0000-0000-0000000000e9'
\set Y '00000000-0000-0000-0000-0000000000d4'
create temp table res (n text, ok boolean);
delete from public.bellaia_permissions; delete from auth.users;
insert into auth.users(id) values (:'F'), (:'S'), (:'C');
update public.profiles set role = 'fondatrice' where id = :'F';
update public.profiles set role = 'assistante' where id = :'S';
insert into public.bellaia_permissions(user_id, permission) values (:'S', 'acces_complet');
insert into auth.users(id, raw_user_meta_data) values (:'X', '{"role":"fondatrice","prenom":"Pirate"}');
insert into res select '01 inscription demandant « fondatrice » → profil « cliente »', (select role from public.profiles where id = :'X') = 'cliente';
insert into auth.users(id) values (:'Y'); delete from public.profiles where id = :'Y';
select pg_temp.essai(:'Y', format($q$insert into public.profiles(id, role) values (%L, 'fondatrice')$q$, :'Y')) as e \gset
insert into res select '02 compte sans profil se crée « fondatrice » → refusé ou forcé « cliente »', :'e' = 'refusé' or (select role from public.profiles where id = :'Y') = 'cliente';
select pg_temp.essai(:'C', format($q$update public.profiles set role = 'fondatrice' where id = %L$q$, :'C')) as e \gset
insert into res select '03 cliente change son propre rôle → sans effet', (select role from public.profiles where id = :'C') = 'cliente';
insert into res select '04 cliente modifie son prénom → accepté', pg_temp.compte(:'C', format($q$with m as (update public.profiles set prenom = 'Nouveau' where id = %L returning 1) select count(*) from m$q$, :'C')) = 1;
insert into res select '05 cliente lit les autres profils → 0', pg_temp.compte(:'C', 'select count(*) from public.profiles where id <> auth.uid()') = 0;
select pg_temp.essai(:'S', format($q$update public.profiles set role = 'fondatrice' where id = %L$q$, :'S')) as e \gset
insert into res select '06 acces_complet se donne « fondatrice » → sans effet', (select role from public.profiles where id = :'S') = 'assistante';
select pg_temp.essai(:'S', format($q$update public.profiles set role = 'assistante' where id = %L$q$, :'C')) as e \gset
insert into res select '07 acces_complet promeut la cliente → refusé (réservé à la fondatrice)', (select role from public.profiles where id = :'C') = 'cliente';
select pg_temp.essai(:'S', format($q$delete from public.profiles where id = %L$q$, :'C')) as e \gset
insert into res select '08 acces_complet supprime un profil → impossible', exists (select 1 from public.profiles where id = :'C');
insert into res select '09 acces_complet lit les profils (supervision) → autorisé', pg_temp.compte(:'S', 'select count(*) from public.profiles') >= 4;
select pg_temp.essai(:'F', format($q$update public.profiles set role = 'assistante' where id = %L$q$, :'C')) as e \gset
insert into res select '10 fondatrice nomme la cliente « assistante » → accepté', (select role from public.profiles where id = :'C') = 'assistante';
select pg_temp.essai(:'F', format($q$update public.profiles set statut = 'suspendu' where id = %L$q$, :'C')) as e \gset
insert into res select '11 fondatrice suspend un compte → accepté', (select statut from public.profiles where id = :'C') = 'suspendu';
select pg_temp.essai(:'F', format($q$update public.profiles set role = 'fondatrice' where id = %L$q$, :'C')) as e \gset
insert into res select '12 fondatrice crée une 2e « fondatrice » depuis l''application → refusé', (select role from public.profiles where id = :'C') <> 'fondatrice';
select pg_temp.essai(:'S', format($q$update public.profiles set statut = 'suspendu' where id = %L$q$, :'S')) as e \gset
insert into res select '13 acces_complet modifie son propre statut → sans effet', (select coalesce(statut,'') from public.profiles where id = :'S') <> 'suspendu';
select n, ok from res order by n;
drop table res;
