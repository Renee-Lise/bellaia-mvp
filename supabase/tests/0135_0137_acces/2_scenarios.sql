-- Scénarios 0135–0137 (après application). t = comportement attendu, f = défaut.
-- Comptes fictifs (base jetable uniquement) : F fondatrice ; G gestion des candidatures ; C candidate connectée ;
-- X autre compte ; A assistante (FOOD + EVENTS) ; R responsable FOOD (acces.suspendre FOOD) ; H hôte ; N personne invitée.
\set F '00000000-0000-0000-0000-0000000000f1'
\set G '00000000-0000-0000-0000-000000000061'
\set C '00000000-0000-0000-0000-0000000000c1'
\set X '00000000-0000-0000-0000-0000000000e9'
\set A '00000000-0000-0000-0000-0000000000a1'
\set R '00000000-0000-0000-0000-0000000000b1'
\set H '00000000-0000-0000-0000-0000000000d1'
\set N '00000000-0000-0000-0000-000000000071'
create or replace function pg_temp.essai_anon(q text) returns text language plpgsql as $$
begin perform set_config('request.jwt.claims', '{}', true); execute 'set local role anon'; execute q; execute 'reset role'; return 'accepté';
exception when others then execute 'reset role'; return 'refusé'; end $$;
create temp table res (n text, ok boolean);
insert into auth.users(id, email) values (:'F','f@essai.invalid'), (:'G','g@essai.invalid'), (:'C','c@essai.invalid'), (:'X','x@essai.invalid'), (:'A','a@essai.invalid'), (:'R','r@essai.invalid'), (:'H','h@essai.invalid'), (:'N','nouvelle@essai.invalid');
update public.profiles set role = 'fondatrice' where id = :'F';
update public.profiles set role = 'assistante' where id in (:'G', :'A', :'R');
insert into public.bellaia_permissions(user_id, permission, univers) values (:'G','candidatures.gerer','*'), (:'A','food.consulter','FOOD'), (:'A','events.consulter','EVENTS'),
  (:'R','acces.suspendre','FOOD'), (:'R','missions.gerer','FOOD'), (:'H','food.consulter','FOOD');
-- Le sujet du jeton reste « postgres » sans identité pour la préparation
select set_config('request.jwt.claims', '{}', false);

-- ── 0135 Candidatures
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email, ville, majeur_declare, rgpd_accepte_le, conditions_acceptees_le, statut, motivation)
  values ('hote','Hôte essai','hote@essai.invalid','Cayenne', true, now(), now(), 'accepte', 'Accueillir les invitées')$q$) as e \gset
insert into res select '01 visiteur dépose une candidature hôte → acceptée, statut forcé « nouvelle »', :'e' = 'accepté' and (select statut from public.bellaia_candidatures where email = 'hote@essai.invalid') = 'nouvelle';
select pg_temp.essai(:'C', $q$insert into public.bellaia_candidatures(type, nom_affiche, email, poles, majeur_declare, rgpd_accepte_le, conditions_acceptees_le, disponibilites, experience)
  values ('assistant','Candidate C','c@essai.invalid','{FOOD}', true, now(), now(), 'week-ends', 'restauration 2 ans')$q$) as e \gset
insert into res select '02 candidature assistante connectée → rattachée à son compte', (select profile_id from public.bellaia_candidatures where email = 'c@essai.invalid') = :'C';
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email, majeur_declare, rgpd_accepte_le, conditions_acceptees_le, donnees)
  values ('modele','Modèle 1','m1@essai.invalid', true, now(), now(), '{"date_naissance":"2000-01-01"}')$q$) as e \gset
insert into res select '03a candidature modèle avec date de naissance → refusée (donnée non nécessaire)', :'e' = 'refusé';
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email, majeur_declare, rgpd_accepte_le, conditions_acceptees_le, donnees)
  values ('modele','Modèle 2','m2@essai.invalid', true, now(), now(), '{"missions_acceptees":["produits","beaute"],"limites":["pas de lingerie"]}')$q$) as e \gset
insert into res select '03b candidature modèle (missions acceptées et limites) → acceptée', :'e' = 'accepté';
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email, rgpd_accepte_le) values ('membres','Membre','mb@essai.invalid', now())$q$) as e \gset
insert into res select '04a accès Membres sans déclaration de majorité → refusé', :'e' = 'refusé';
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email, majeur_declare, rgpd_accepte_le) values ('membres','Membre','mb@essai.invalid', true, now())$q$) as e \gset
insert into res select '04b accès Membres avec majorité déclarée → accepté', :'e' = 'accepté';
select pg_temp.essai_anon($q$insert into public.bellaia_candidatures(type, nom_affiche, email) values ('autre','Sans consentement','s@essai.invalid')$q$) as e \gset
insert into res select '05 dépôt sans information RGPD acceptée → refusé', :'e' = 'refusé';
insert into res select '06 visiteur : aucune candidature lisible', pg_temp.compte_anon('select count(*) from public.bellaia_candidatures') <= 0;
insert into res select '07 candidate : ne lit que son dossier (1)', pg_temp.compte(:'C', 'select count(*) from public.bellaia_candidatures') = 1;
insert into res select '08 autre compte : 0 dossier lisible', pg_temp.compte(:'X', 'select count(*) from public.bellaia_candidatures') = 0;
select pg_temp.essai(:'C', $q$update public.bellaia_candidatures set statut = 'accepte' where email = 'c@essai.invalid'$q$) as e \gset
insert into res select '09 candidate se déclare « acceptée » → sans effet', (select statut from public.bellaia_candidatures where email = 'c@essai.invalid') = 'nouvelle';
select pg_temp.essai(:'G', $q$update public.bellaia_candidatures set statut = 'incomplet' where email = 'c@essai.invalid'$q$) as e \gset
select pg_temp.essai(:'C', $q$update public.bellaia_candidatures set ville = 'Kourou' where email = 'c@essai.invalid'$q$) as e \gset
insert into res select '10 dossier incomplet complété par la candidate → « à analyser »', (select statut || ville from public.bellaia_candidatures where email = 'c@essai.invalid') = 'a_analyserKourou';
select pg_temp.essai(:'G', $q$select public.candidature_proposer((select id from public.bellaia_candidatures where email = 'c@essai.invalid'), '{"statut_propose":"accepte","explication":"profil parfait pour le poste"}')$q$) as e \gset
insert into res select '11a agent propose « accepte » → refusé', :'e' = 'refusé';
select pg_temp.essai(:'G', $q$select public.candidature_proposer((select id from public.bellaia_candidatures where email = 'c@essai.invalid'), '{"statut_propose":"a_contacter","explication":"Disponibilités compatibles ; zones de déplacement manquantes","version_criteres":"v1"}')$q$) as e \gset
insert into res select '11b agent propose « à contacter » avec explication → enregistré', (select proposition->>'statut_propose' from public.bellaia_candidatures where email = 'c@essai.invalid') = 'a_contacter';
select pg_temp.essai(:'G', $q$update public.bellaia_candidatures set statut = 'accepte' where email = 'c@essai.invalid'$q$) as e \gset
insert into res select '12 gestionnaire sans droit de décision accepte → refusé', (select statut from public.bellaia_candidatures where email = 'c@essai.invalid') <> 'accepte';
select pg_temp.essai(:'G', $q$update public.bellaia_candidatures set statut = 'a_contacter' where email = 'c@essai.invalid'$q$) as e \gset
do $$ begin perform set_config('request.jwt.claims', '{}', true); update public.bellaia_candidatures set statut = 'accepte' where email = 'c@essai.invalid'; exception when others then null; end $$;
insert into res select '13 traitement automatique (aucune personne connectée) accepte → sans effet', (select statut from public.bellaia_candidatures where email = 'c@essai.invalid') <> 'accepte';
select pg_temp.essai(:'F', $q$update public.bellaia_candidatures set statut = 'refuse' where email = 'mb@essai.invalid'$q$) as e \gset
insert into res select '14a refus sans motif → refusé', :'e' = 'refusé';
select pg_temp.essai(:'F', $q$update public.bellaia_candidatures set statut = 'refuse', decision_motif = 'Espace Membres complet pour cette session' where email = 'mb@essai.invalid'$q$) as e \gset
insert into res select '14b refus motivé par la fondatrice → décision datée et signée', (select decision_par = :'F' and decision_le is not null from public.bellaia_candidatures where email = 'mb@essai.invalid');
insert into res select '14c historique : transition « →refuse » tracée', exists (select 1 from public.bellaia_candidatures_historique h join public.bellaia_candidatures c on c.id = h.candidature_id where c.email = 'mb@essai.invalid' and h.action like '%→refuse');
insert into res select '14d candidate : historique illisible (0)', pg_temp.compte(:'C', 'select count(*) from public.bellaia_candidatures_historique') = 0;
select pg_temp.essai(:'C', $q$insert into public.bellaia_candidatures_historique(candidature_id, action) select id, 'faux' from public.bellaia_candidatures limit 1$q$) as e \gset
insert into res select '14e personne ne peut écrire dans l''historique', :'e' = 'refusé';

-- ── 0137 Invitations (après validation humaine)
select pg_temp.essai(:'F', $q$update public.bellaia_candidatures set statut = 'accepte', email = 'nouvelle@essai.invalid' where email = 'hote@essai.invalid'$q$) as e \gset
select pg_temp.essai(:'F', $q$select public.creer_invitation((select id from public.bellaia_candidatures where email = 'm2@essai.invalid'), '{hote}', '{}')$q$) as e \gset
insert into res select '15a invitation pour une candidature non acceptée → refusée', :'e' = 'refusé';
select pg_temp.essai(:'F', $q$select public.creer_invitation((select id from public.bellaia_candidatures where email = 'nouvelle@essai.invalid'), '{hote}', '{acces_complet}')$q$) as e \gset
insert into res select '15b invitation avec « accès complet » → refusée (jamais de privilège par formulaire)', :'e' = 'refusé';
select pg_temp.essai(:'G', $q$select public.creer_invitation((select id from public.bellaia_candidatures where email = 'nouvelle@essai.invalid'), '{hote}', '{food.consulter}')$q$) as e \gset
insert into res select '15c invitation créée par la gestion (non fondatrice) → refusée', :'e' = 'refusé';
create temp table jeton (j text); grant all on jeton to authenticated;
do $$ begin perform set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000f1')::text, true); execute 'set local role authenticated';
  insert into jeton select public.creer_invitation((select id from public.bellaia_candidatures where email = 'nouvelle@essai.invalid'), '{hote}', '{food.consulter}', 'FOOD'); execute 'reset role'; end $$;
insert into res select '15d invitation créée : jeton remis une fois, seul son condensé est stocké', (select length(j) from jeton) = 64 and not exists (select 1 from public.bellaia_invitations where jeton_condense = (select j from jeton));
select j as jeton from jeton \gset
select pg_temp.essai(:'X', format($q$select public.accepter_invitation(%L, 'v1')$q$, :'jeton')) as e \gset
insert into res select '16a invitation utilisée par une autre adresse → refusée', :'e' = 'refusé';
select pg_temp.essai(:'N', format($q$select public.accepter_invitation(%L, 'v1')$q$, :'jeton')) as e \gset
insert into res select '16b invitation acceptée : rôle « hôte » et permission validée activés, conditions horodatées, compte rattaché au dossier',
  (select profile_id from public.bellaia_candidatures where email = 'nouvelle@essai.invalid') = :'N' and exists (select 1 from public.bellaia_roles where user_id = :'N' and role = 'hote' and statut = 'actif') and exists (select 1 from public.bellaia_permissions where user_id = :'N' and permission = 'food.consulter' and statut = 'active')
  and (select conditions_acceptees_le is not null from public.bellaia_invitations limit 1);
select pg_temp.essai(:'N', format($q$select public.accepter_invitation(%L, 'v1')$q$, :'jeton')) as e \gset
insert into res select '16c invitation réutilisée → refusée', :'e' = 'refusé';
update public.bellaia_invitations set utilisee_le = null, expire_le = now() - interval '1 minute';
select pg_temp.essai(:'N', format($q$select public.accepter_invitation(%L, 'v1')$q$, :'jeton')) as e \gset
insert into res select '16d invitation expirée → refusée', :'e' = 'refusé';
insert into res select '16e aucun rôle privilégié ni accès complet pour la personne invitée', not exists (select 1 from public.bellaia_permissions where user_id = :'N' and permission = 'acces_complet') and (select role from public.profiles where id = :'N') = 'cliente';

-- ── 0136 Suspensions, révocations, désactivation
insert into res select '17a avant suspension : A a accès à FOOD et à EVENTS', pg_temp.compte(:'A', $q$select (public.a_permission('food.consulter','FOOD') and public.a_permission('events.consulter','EVENTS'))::int$q$) = 1;
select pg_temp.essai(:'R', format($q$insert into public.bellaia_suspensions(user_id, univers, motif) values (%L, 'FOOD', 'Contrôle qualité en cours')$q$, :'A')) as e \gset
insert into res select '17b le responsable FOOD suspend A dans FOOD seulement → FOOD refusé, EVENTS conservé', pg_temp.compte(:'A', $q$select ((not public.a_permission('food.consulter','FOOD')) and public.a_permission('events.consulter','EVENTS'))::int$q$) = 1;
select pg_temp.essai(:'R', format($q$insert into public.bellaia_suspensions(user_id, univers, motif) values (%L, '*', 'Suspension globale')$q$, :'H')) as e \gset
insert into res select '17c le responsable de pôle tente une suspension globale → refusée', :'e' = 'refusé';
select pg_temp.essai(:'R', format($q$insert into public.bellaia_suspensions(user_id, univers, motif) values (%L, 'FOOD', 'Essai')$q$, :'F')) as e \gset
insert into res select '17d suspendre la fondatrice → refusé', :'e' = 'refusé';
select pg_temp.essai(:'R', format($q$insert into public.bellaia_suspensions(user_id, univers, motif) values (%L, 'FOOD', 'x')$q$, :'H')) as e \gset
insert into res select '17e suspension sans motif → refusée', :'e' = 'refusé';
select pg_temp.essai(:'A', $q$update public.bellaia_suspensions set levee_le = now(), levee_motif = 'je me libère' where user_id = auth.uid()$q$) as e \gset
insert into res select '17f A lève sa propre suspension → sans effet', (select count(*) from public.bellaia_suspensions where user_id = :'A' and levee_le is null) = 1;
select pg_temp.essai(:'R', format($q$update public.bellaia_suspensions set levee_le = now() where user_id = %L$q$, :'A')) as e \gset
insert into res select '18a levée sans motif → refusée', :'e' = 'refusé';
select pg_temp.essai(:'R', format($q$update public.bellaia_suspensions set levee_le = now(), levee_motif = 'Contrôle terminé' where user_id = %L$q$, :'A')) as e \gset
insert into res select '18b levée motivée → A retrouve FOOD (réactivation)', pg_temp.compte(:'A', $q$select public.a_permission('food.consulter','FOOD')::int$q$) = 1;
insert into res select '18c suspension et levée journalisées', (select count(*) from public.bellaia_journal where action like 'bellaia_suspensions.%' and cible = :'A') = 2;
select pg_temp.essai(:'F', format($q$delete from public.bellaia_permissions where user_id = %L and permission = 'events.consulter'$q$, :'A')) as e \gset
insert into res select '19a retrait d''une permission → ligne conservée « révoquée » (date, auteur), droit perdu',
  (select statut = 'revoquee' and revoque_le is not null and revoque_par = :'F' from public.bellaia_permissions where user_id = :'A' and permission = 'events.consulter')
  and pg_temp.compte(:'A', $q$select public.a_permission('events.consulter','EVENTS')::int$q$) = 0;
select pg_temp.essai(:'F', format($q$update public.bellaia_permissions set statut = 'active' where user_id = %L and permission = 'events.consulter'$q$, :'A')) as e \gset
insert into res select '19b une révocation ne se « réactive » pas en douce → refusé', :'e' = 'refusé';
select pg_temp.essai(:'F', format($q$insert into public.bellaia_permissions(user_id, permission, univers) values (%L, 'events.consulter', 'EVENTS')$q$, :'A')) as e \gset
insert into res select '19c nouvelle attribution → nouvelle ligne active, historique conservé', (select count(*) from public.bellaia_permissions where user_id = :'A' and permission = 'events.consulter') = 2 and pg_temp.compte(:'A', $q$select public.a_permission('events.consulter','EVENTS')::int$q$) = 1;
select pg_temp.essai(:'A', format($q$insert into public.bellaia_permissions(user_id, permission) values (%L, 'acces_complet')$q$, :'A')) as e \gset
insert into res select '20 A s''attribue « accès complet » → refusé', :'e' = 'refusé';
insert into auth.sessions(user_id) values (:'A'), (:'A'); insert into auth.refresh_tokens(user_id) values (:'A');
select pg_temp.essai(:'F', format($q$select public.changer_etat_compte(%L, 'inactif', 'Fin de collaboration')$q$, :'A')) as e \gset
insert into res select '21a désactivation : plus aucun droit, sessions fermées, jetons révoqués, données conservées',
  pg_temp.compte(:'A', $q$select (public.a_permission('food.consulter','FOOD') or public.a_permission('events.consulter','EVENTS'))::int$q$) = 0
  and (select count(*) from auth.sessions where user_id = :'A') = 0 and (select bool_and(revoked) from auth.refresh_tokens where user_id = :'A')
  and exists (select 1 from public.profiles where id = :'A');
select pg_temp.essai(:'F', format($q$select public.changer_etat_compte(%L, 'actif', 'Reprise de la collaboration')$q$, :'A')) as e \gset
insert into res select '21b réactivation : droits rétablis', pg_temp.compte(:'A', $q$select public.a_permission('food.consulter','FOOD')::int$q$) = 1;
select pg_temp.essai(:'F', format($q$select public.changer_etat_compte(%L, 'inactif', 'Essai sur moi-même')$q$, :'F')) as e \gset
insert into res select '22a la fondatrice se désactive elle-même → refusé', :'e' = 'refusé';
select pg_temp.essai(:'G', format($q$select public.changer_etat_compte(%L, 'inactif', 'Tentative')$q$, :'A')) as e \gset
insert into res select '22b désactivation par un compte non fondatrice → refusée', :'e' = 'refusé';
select pg_temp.essai(:'F', format($q$select public.changer_etat_compte(%L, 'inactif', '')$q$, :'H')) as e \gset
insert into res select '22c désactivation sans motif → refusée', :'e' = 'refusé';

-- ── 0137 Missions
select pg_temp.essai(:'F', format($q$insert into public.bellaia_missions(id, pole, titre, assigne_a, nature) values ('00000000-0000-0000-0000-00000000aa01', 'FOOD', 'Étiquettes du samedi', %L, 'tache')$q$, :'A')) as e \gset
insert into res select '23a mission transmise visible dans l''espace de la personne', pg_temp.compte(:'A', 'select count(*) from public.bellaia_missions') = 1;
select pg_temp.essai(:'A', $q$select public.mission_accuser_reception('00000000-0000-0000-0000-00000000aa01')$q$) as e \gset
insert into res select '23b accusé de réception enregistré et tracé dans le fil', (select accuse_reception_le is not null from public.bellaia_missions where id = '00000000-0000-0000-0000-00000000aa01')
  and exists (select 1 from public.bellaia_missions_fil where mission_id = '00000000-0000-0000-0000-00000000aa01' and texte = 'Réception confirmée');
select pg_temp.essai(:'A', $q$select public.mission_avancer('00000000-0000-0000-0000-00000000aa01', 50, 'moitié faite')$q$) as e \gset
insert into res select '23c avancement 50 % → « en cours »', (select statut || progression from public.bellaia_missions where id = '00000000-0000-0000-0000-00000000aa01') = 'en_cours50';
select pg_temp.essai(:'A', $q$select public.mission_avancer('00000000-0000-0000-0000-00000000aa01', 100)$q$) as e \gset
insert into res select '23d avancement 100 % → « à valider » (pas « fait » sans validation)', (select statut from public.bellaia_missions where id = '00000000-0000-0000-0000-00000000aa01') = 'a_valider';
select pg_temp.essai(:'X', $q$select public.mission_avancer('00000000-0000-0000-0000-00000000aa01', 10)$q$) as e \gset
insert into res select '23e un autre compte déclare l''avancement → refusé', :'e' = 'refusé';
select pg_temp.essai(:'A', $q$update public.bellaia_missions set titre = 'modifié', statut = 'fait' where id = '00000000-0000-0000-0000-00000000aa01'$q$) as e \gset
insert into res select '23f la destinataire modifie directement la mission → sans effet', (select titre from public.bellaia_missions where id = '00000000-0000-0000-0000-00000000aa01') = 'Étiquettes du samedi';
select pg_temp.essai(:'R', format($q$insert into public.bellaia_suspensions(user_id, univers, motif) values (%L, 'FOOD', 'Nouvelle vérification')$q$, :'A')) as e \gset
insert into res select '24a A suspendue dans FOOD : mission FOOD illisible', pg_temp.compte(:'A', 'select count(*) from public.bellaia_missions') = 0;
select pg_temp.essai(:'R', format($q$select public.mission_transferer('00000000-0000-0000-0000-00000000aa01', %L, 'x')$q$, :'H')) as e \gset
insert into res select '24b transfert sans motif → refusé', :'e' = 'refusé';
select pg_temp.essai(:'R', format($q$select public.mission_transferer('00000000-0000-0000-0000-00000000aa01', %L, 'Absence de A')$q$, :'H')) as e \gset
insert into res select '24c transfert motivé → H la voit, réception à refaire', pg_temp.compte(:'H', 'select count(*) from public.bellaia_missions where accuse_reception_le is null') = 1;
select pg_temp.essai(:'H', format($q$select public.mission_transferer('00000000-0000-0000-0000-00000000aa01', %L, 'je la rends')$q$, :'X')) as e \gset
insert into res select '24d transfert par une personne sans droit de gestion → refusé', :'e' = 'refusé';

-- ── 0135 Documents (médiathèque privée)
select pg_temp.essai(:'G', $q$update public.bellaia_candidatures set statut = 'incomplet' where email = 'c@essai.invalid'$q$) as e \gset
select pg_temp.essai(:'C', $q$insert into public.bellaia_candidatures_documents(candidature_id, chemin, type, taille) select id, 'candidatures/' || id || '/cv.pdf', 'cv', 2048 from public.bellaia_candidatures where email = 'c@essai.invalid'$q$) as e \gset
insert into res select '25a dossier incomplet : la candidate dépose la pièce manquante dans son dossier', :'e' = 'accepté' and (select count(*) from public.bellaia_candidatures_documents) = 1;
select pg_temp.essai(:'C', $q$insert into public.bellaia_candidatures_documents(candidature_id, chemin) select id, 'candidatures/00000000-0000-0000-0000-000000000000/x.pdf' from public.bellaia_candidatures where email = 'c@essai.invalid'$q$) as e \gset
insert into res select '25b dépôt hors de son dossier → refusé', :'e' = 'refusé';
insert into res select '25c autre compte : document illisible', pg_temp.compte(:'X', 'select count(*) from public.bellaia_candidatures_documents') = 0;
select pg_temp.essai(:'C', $q$select public.document_candidature_consulter((select id from public.bellaia_candidatures_documents limit 1))$q$) as e \gset
insert into res select '25d consultation par la fonction de gestion : refusée à la candidate', :'e' = 'refusé';
select pg_temp.essai(:'G', $q$select public.document_candidature_consulter((select id from public.bellaia_candidatures_documents limit 1))$q$) as e \gset
insert into res select '25e consultation par la gestion → journalisée', (select count(*) from public.bellaia_documents_consultations where par = :'G') = 1;
select pg_temp.essai(:'G', 'select public.candidatures_purger()') as e \gset
insert into res select '26a purge RGPD par la gestion → refusée', :'e' = 'refusé';
set session_replication_role = replica; -- préparation du test (échéance dépassée), hors contrôles
update public.bellaia_candidatures set conserver_jusqu_au = current_date - 1 where email = 'mb@essai.invalid';
set session_replication_role = origin;
select pg_temp.essai(:'F', 'select public.candidatures_purger()') as e \gset
insert into res select '26b purge par la fondatrice : seuls les dossiers échus refusés/archivés/non traités', not exists (select 1 from public.bellaia_candidatures where email = 'mb@essai.invalid') and exists (select 1 from public.bellaia_candidatures where email = 'c@essai.invalid');
select n, ok from res order by n;
drop table res; drop table jeton;
