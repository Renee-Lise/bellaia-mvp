-- Scénarios après 0133 (base neuve, état de production + migration). Chaque ligne doit afficher « t ».
\set A '00000000-0000-0000-0000-0000000000a1'
\set B '00000000-0000-0000-0000-0000000000b1'
\set X '00000000-0000-0000-0000-0000000000c9'
\set F '00000000-0000-0000-0000-0000000000f1'
\set C '11111111-1111-1111-1111-111111111111'
\set D '33333333-3333-3333-3333-333333333333'
insert into auth.users values (:'A'), (:'B'), (:'X'), (:'F') on conflict do nothing;
insert into public.profiles(id, role) values (:'A','assistante'), (:'B','assistante'), (:'X','cliente'), (:'F','fondatrice') on conflict do nothing;

-- Parcours légitimes (comme l'application : création avec retour de la ligne, puis membres en une requête)
select '01 A crée une conversation et la relit aussitôt (retour de ligne)' t, pg_temp.compte(:'A', format($q$with c as (insert into public.bellaia_conversations(id, nom, type) values (%L, 'Direction', 'direct') returning id) select count(*) from c$q$, :'C')) = 1 ok
union all select '03 A s''ajoute administratrice et ajoute B en une seule requête', pg_temp.essai(:'A', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id, role) values (%L, %L, 'admin'), (%L, %L, 'membre')$q$, :'C', :'A', :'C', :'B')) = 'accepté'
union all select '04 A envoie un message', pg_temp.essai(:'A', format($q$insert into public.bellaia_messages(conversation_id, expediteur, contenu, auteur_id) values (%L, 'A', 'Chiffre d''affaires confidentiel', %L)$q$, :'C', :'A')) = 'accepté'
union all select '05 B envoie un message', pg_temp.essai(:'B', format($q$insert into public.bellaia_messages(conversation_id, expediteur, contenu, auteur_id) values (%L, 'B', 'Bien reçu', %L)$q$, :'C', :'B')) = 'accepté'
union all select '06 B lit les 2 messages', pg_temp.compte(:'B', 'select count(*) from public.bellaia_messages') = 2;
select '02 le créateur est enregistré automatiquement (cree_par = A)' t, (select cree_par = :'A' from public.bellaia_conversations where id = :'C') ok;

-- Attaques (Red Team)
select '07 ATTAQUE : X s''ajoute seul à la conversation → refusé' t, pg_temp.essai(:'X', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'X')) = 'refusé' ok
union all select '08 ATTAQUE : X s''ajoute en se déclarant administrateur → refusé', pg_temp.essai(:'X', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id, role) values (%L, %L, 'admin')$q$, :'C', :'X')) = 'refusé'
union all select '09 ATTAQUE : B (simple membre) ajoute X → refusé', pg_temp.essai(:'B', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'X')) = 'refusé'
union all select '10 ATTAQUE : X lit les messages → 0', pg_temp.compte(:'X', 'select count(*) from public.bellaia_messages') = 0
union all select '11 ATTAQUE : X lit la conversation et ses membres → 0', pg_temp.compte(:'X', 'select (select count(*) from public.bellaia_conversations) + (select count(*) from public.bellaia_conv_membres)') = 0
union all select '12 ATTAQUE : X écrit dans la conversation → refusé', pg_temp.essai(:'X', format($q$insert into public.bellaia_messages(conversation_id, expediteur, contenu, auteur_id) values (%L, 'X', 'intrus', %L)$q$, :'C', :'X')) = 'refusé'
union all select '13 ATTAQUE : X écrit en se faisant passer pour A → refusé', pg_temp.essai(:'X', format($q$insert into public.bellaia_messages(conversation_id, expediteur, contenu, auteur_id) values (%L, 'A', 'faux', %L)$q$, :'C', :'A')) = 'refusé'
union all select '14 ATTAQUE : B modifie le message de A → 0 ligne', pg_temp.compte(:'B', $q$with m as (update public.bellaia_messages set contenu = 'falsifié' where auteur_id <> auth.uid() returning 1) select count(*) from m$q$) = 0
union all select '15 le message de A est intact', (select contenu = 'Chiffre d''affaires confidentiel' from public.bellaia_messages where auteur_id = :'A')
union all select '16 B modifie son propre message → 1 ligne', pg_temp.compte(:'B', $q$with m as (update public.bellaia_messages set contenu = 'Bien reçu, merci' where auteur_id = auth.uid() returning 1) select count(*) from m$q$) = 1
union all select '17 ATTAQUE : B s''attribue son message à A → refusé', pg_temp.essai(:'B', format($q$update public.bellaia_messages set auteur_id = %L where auteur_id = auth.uid()$q$, :'A')) = 'refusé'
union all select '18 ATTAQUE : B déplace son message vers une autre conversation → refusé', pg_temp.essai(:'B', format($q$insert into public.bellaia_conversations(id, nom) values (%L, 'B seule'); insert into public.bellaia_conv_membres(conversation_id, user_id, role) values (%L, auth.uid(), 'admin'); update public.bellaia_messages set conversation_id = %L where auteur_id = auth.uid()$q$, :'D', :'D', :'D')) = 'refusé'
union all select '19 ATTAQUE : B se promeut administratrice → refusé', pg_temp.essai(:'B', format($q$update public.bellaia_conv_membres set role = 'admin' where conversation_id = %L and user_id = auth.uid()$q$, :'C')) = 'refusé'
union all select '20 B règle ses notifications (autorisé)', pg_temp.compte(:'B', format($q$with m as (update public.bellaia_conv_membres set notifs_actives = false where conversation_id = %L and user_id = auth.uid() returning 1) select count(*) from m$q$, :'C')) = 1
union all select '21 ATTAQUE : X crée une conversation au nom de A → refusé', pg_temp.essai(:'X', format($q$insert into public.bellaia_conversations(nom, cree_par) values ('usurpation', %L)$q$, :'A')) = 'refusé'
union all select '22 ATTAQUE : A change le créateur de sa conversation → refusé', pg_temp.essai(:'A', format($q$update public.bellaia_conversations set cree_par = %L where id = %L$q$, :'X', :'C')) = 'refusé'
union all select '23 ATTAQUE : X réagit au message de A (identifiant connu) → refusé', pg_temp.essai(:'X', format($q$insert into public.bellaia_msg_reactions(message_id, user_id, emoji) values (%L, %L, '👍')$q$, (select id from public.bellaia_messages where auteur_id = :'A'), :'X')) = 'refusé'
union all select '24 B réagit au message de A (membre)', pg_temp.compte(:'B', format($q$with r as (insert into public.bellaia_msg_reactions(message_id, user_id, emoji) values (%L, %L, '👍') returning 1) select count(*) from r$q$, (select id from public.bellaia_messages where auteur_id = :'A'), :'B')) = 1
union all select '25 visiteur non connecté : 0 conversation, 0 message', pg_temp.compte_anon('select (select count(*) from public.bellaia_conversations) + (select count(*) from public.bellaia_messages)') in (0, -1)
union all select '26 la fondatrice non membre ne lit pas d''office les messages privés', pg_temp.compte(:'F', 'select count(*) from public.bellaia_messages') = 0;

-- Pièces jointes (compartiment privé, chemin <auteur>/<conversation>/<fichier>)
select '27 le compartiment est privé' t, (select public = false from storage.buckets where id = 'messaging-attachments') ok
union all select '28 B dépose une pièce jointe dans la conversation', pg_temp.essai(:'B', format($q$insert into storage.objects(bucket_id, name) values ('messaging-attachments', %L)$q$, :'B' || '/' || :'C' || '/devis.pdf')) = 'accepté'
union all select '29 ATTAQUE : X dépose dans la conversation → refusé', pg_temp.essai(:'X', format($q$insert into storage.objects(bucket_id, name) values ('messaging-attachments', %L)$q$, :'X' || '/' || :'C' || '/virus.pdf')) = 'refusé'
union all select '30 ATTAQUE : X dépose sous le nom de B → refusé', pg_temp.essai(:'X', format($q$insert into storage.objects(bucket_id, name) values ('messaging-attachments', %L)$q$, :'B' || '/' || :'C' || '/faux.pdf')) = 'refusé'
union all select '31 ATTAQUE : chemin malformé → refusé sans erreur', pg_temp.essai(:'X', format($q$insert into storage.objects(bucket_id, name) values ('messaging-attachments', %L)$q$, :'X' || '/pas-un-identifiant/f.pdf')) = 'refusé'
union all select '32 A (membre) voit la pièce jointe', pg_temp.compte(:'A', $q$select count(*) from storage.objects where bucket_id = 'messaging-attachments'$q$) = 1
union all select '33 ATTAQUE : X ne voit pas la pièce jointe', pg_temp.compte(:'X', $q$select count(*) from storage.objects where bucket_id = 'messaging-attachments'$q$) = 0;

-- Départ et retrait
select '34 B quitte la conversation' t, pg_temp.compte(:'B', format($q$with m as (delete from public.bellaia_conv_membres where conversation_id = %L and user_id = auth.uid() returning 1) select count(*) from m$q$, :'C')) = 1 ok
union all select '35 B ne lit plus les messages ni la pièce jointe', pg_temp.compte(:'B', format($q$select (select count(*) from public.bellaia_messages where conversation_id = %L) + (select count(*) from storage.objects where bucket_id = 'messaging-attachments' and name like %L)$q$, :'C', '%' || :'C' || '%')) = 0
union all select '36 ATTAQUE : B, retirée, se réinscrit seule → refusé', pg_temp.essai(:'B', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'B')) = 'refusé'
union all select '37 A (administratrice) peut la réinviter', pg_temp.essai(:'A', format($q$insert into public.bellaia_conv_membres(conversation_id, user_id) values (%L, %L)$q$, :'C', :'B')) = 'accepté'
union all select '38 ATTAQUE ancien modèle : X rejoint seul une conversation → refusé', pg_temp.essai(:'X', $q$insert into public.conversation_membres values (gen_random_uuid(), auth.uid())$q$) = 'refusé';
