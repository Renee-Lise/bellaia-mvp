-- Démonstration des failles sur l'état ACTUEL de production (avant 0133). « t » = la faille est exploitable.
\set A '00000000-0000-0000-0000-0000000000a1'
\set B '00000000-0000-0000-0000-0000000000b1'
\set X '00000000-0000-0000-0000-0000000000c9'
\set C '11111111-1111-1111-1111-111111111111'
\set L '22222222-2222-2222-2222-222222222222'
insert into auth.users (id) values (:'A'), (:'B'), (:'X'), ('00000000-0000-0000-0000-0000000000f1') on conflict do nothing;
insert into public.profiles(id, role) values (:'A','assistante'), (:'B','assistante'), (:'X','cliente'), ('00000000-0000-0000-0000-0000000000f1','fondatrice') on conflict do nothing;
-- Préparation : conversation privée A–B avec un message de A (comme le ferait l'application)
select 'préparation conversation A–B' t, pg_temp.essai(:'A', format($q$insert into public.bellaia_conversations(id, nom) values (%L, 'Direction')$q$, :'C')) = 'accepté'
 and pg_temp.essai(:'A', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id, role) values (%L, %L, 'admin')$q$, :'C', :'A')) = 'accepté'
 and pg_temp.essai(:'A', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'B')) = 'accepté'
 and pg_temp.essai(:'A', format($q$insert into public.bellaia_messages(conversation_id, expediteur, contenu, auteur_id) values (%L, 'A', 'Chiffre d''affaires confidentiel', %L)$q$, :'C', :'A')) = 'accepté' ok;
select 'FAILLE M1 : X (non invité) s''ajoute seul à la conversation' t, pg_temp.essai(:'X', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'X')) = 'accepté' ok
union all select 'FAILLE M1 : X lit alors le message confidentiel', pg_temp.compte(:'X', 'select count(*) from public.bellaia_messages') = 1
union all select 'FAILLE M2 : B modifie le message de A', pg_temp.compte(:'B', $q$with m as (update public.bellaia_messages set contenu = 'falsifié' where auteur_id <> auth.uid() returning 1) select count(*) from m$q$) = 1
union all select 'FAILLE M3 : création de conversation au nom d''un autre (aucun créateur contrôlé)', pg_temp.essai(:'X', $q$insert into public.bellaia_conversations(nom) values ('spam')$q$) = 'accepté'
union all select 'FAILLE ancien modèle : X rejoint seul une conversation', pg_temp.essai(:'X', format($q$insert into public.conversations(id, nom) values (%L, 'ancienne'); insert into public.conversation_membres values (%L, %L)$q$, :'L', :'L', :'X')) = 'accepté';
