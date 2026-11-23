\set F '00000000-0000-0000-0000-0000000000f1'
\set C '00000000-0000-0000-0000-0000000000c1'
\set X '00000000-0000-0000-0000-0000000000e9'
create temp table res (n text, ok boolean);
select pg_temp.essai(:'C', $q$insert into public.bellaia_demandes(type, objet, message, statut, reponse) values ('rgpd_acces','Accès à mes données','Je souhaite une copie de mes données.','close','faux')$q$) as e \gset
insert into res select '01 la cliente dépose une demande RGPD : statut forcé « reçue », échéance à 1 mois', (select statut = 'recue' and reponse is null and echeance = (now() + interval '1 month')::date from public.bellaia_demandes where objet = 'Accès à mes données');
insert into res select '02 accusé de réception et notification de la fondatrice', (select count(*) from public.bellaia_notifications where type = 'demande_client') = 2;  -- après la 1re demande
select pg_temp.essai(:'C', $q$insert into public.bellaia_demandes(user_id, type, objet, message) values ('00000000-0000-0000-0000-0000000000e9','aide','Usurpation','Message au nom d''une autre personne')$q$) as e \gset
insert into res select '03 déposer au nom d''une autre personne → la demande reste rattachée à son auteur réel', not exists (select 1 from public.bellaia_demandes where user_id = :'X') and exists (select 1 from public.bellaia_demandes where objet = 'Usurpation' and user_id = :'C');
insert into res select '04 la cliente lit ses demandes (2)', pg_temp.compte(:'C', 'select count(*) from public.bellaia_demandes') = 2;
insert into res select '05 un autre compte ne lit rien (0)', pg_temp.compte(:'X', 'select count(*) from public.bellaia_demandes') = 0;
insert into res select '06 un visiteur ne lit rien', pg_temp.compte_anon('select count(*) from public.bellaia_demandes') <= 0;
select pg_temp.essai(:'C', $q$update public.bellaia_demandes set statut = 'close', reponse = 'auto' $q$) as e \gset
insert into res select '07 la cliente modifie statut ou réponse → sans effet', (select bool_and(statut = 'recue' and reponse is null) from public.bellaia_demandes);
select pg_temp.essai(:'F', $q$update public.bellaia_demandes set statut = 'repondue', reponse = 'Copie envoyée.', message = 'altéré' where objet = 'Accès à mes données' $q$) as e \gset
insert into res select '08 la fondatrice répond : réponse datée et signée, message d''origine intact', (select statut = 'repondue' and repondu_par = :'F' and repondu_le is not null and message like 'Je souhaite%' from public.bellaia_demandes where objet = 'Accès à mes données');
select n, ok from res order by n;
