-- F = fondatrice, A1 = assistante sans droit, A2 = assistante « accès complet », C = cliente, H = hôte BSH, anonyme.
\set F '00000000-0000-0000-0000-0000000000f1'
\set A1 '00000000-0000-0000-0000-0000000000a1'
\set A2 '00000000-0000-0000-0000-0000000000a2'
\set C '00000000-0000-0000-0000-0000000000c1'
\set H '00000000-0000-0000-0000-0000000000b1'
-- Insertion telle que l'écran l'envoie (BibliothequeConsignes.enregistrer)
select '01 fondatrice enregistre la v2 (brouillon)', pg_temp.essai(:'F', $q$insert into bellaia_documents(module,reference,titre,categorie,contenu_html,version,statut,entite_type,tags,notes) values ('CONSIGNES','consigne:admin.relance_facture:v2','Relance de facture impayée','administratif','Rédige une relance pour {{client}}…',2,'brouillon','consigne','{administratif,action_sensible}','{"cle":"admin.relance_facture","motif":"Rappel des pénalités"}')$q$);
select '02 la v2 est réellement en base (version 2, brouillon)', (select count(*) from bellaia_documents where reference='consigne:admin.relance_facture:v2' and version=2 and statut='brouillon') = 1;
select '03 même référence une 2e fois refusée (version unique, aucun écrasement)', pg_temp.essai(:'F', $q$insert into bellaia_documents(module,reference,titre,version) values ('CONSIGNES','consigne:admin.relance_facture:v2','doublon',2)$q$) = 'refusé';
select '04 fondatrice enregistre la v3', pg_temp.essai(:'F', $q$insert into bellaia_documents(module,reference,titre,categorie,contenu_html,version,statut) values ('CONSIGNES','consigne:admin.relance_facture:v3','Relance de facture impayée','administratif','texte v3',3,'brouillon')$q$);
-- Validation (BibliothequeConsignes.valider) : la v2 validée, puis la v3 validée remplace la v2
select '05 validation de la v2 (1 ligne modifiée)', pg_temp.compte(:'F', $q$with u as (update bellaia_documents set statut='valide' where reference='consigne:admin.relance_facture:v2' returning 1) select count(*) from u$q$) = 1;
select '06 validation de la v3 : v2 → remplacée, v3 → valide', pg_temp.compte(:'F', $q$with a as (update bellaia_documents set statut='remplacee' where module='CONSIGNES' and reference='consigne:admin.relance_facture:v2' returning 1), b as (update bellaia_documents set statut='valide' where reference='consigne:admin.relance_facture:v3' returning 1) select (select count(*) from a)+(select count(*) from b)$q$) = 2;
select '07 historique conservé : 2 versions, une seule « valide »', (select count(*) from bellaia_documents where reference like 'consigne:admin.relance_facture:%') = 2 and (select count(*) from bellaia_documents where reference like 'consigne:admin.relance_facture:%' and statut='valide') = 1;
select '08 date de mise à jour posée par le déclencheur', (select updated_at > created_at or updated_at = created_at from bellaia_documents where reference='consigne:admin.relance_facture:v3');
-- Autorisations
select '09 assistante sans droit : ne voit aucune consigne', pg_temp.compte(:'A1', $q$select count(*) from bellaia_documents where module='CONSIGNES'$q$) = 0;
select '10 assistante sans droit : écriture refusée', pg_temp.essai(:'A1', $q$insert into bellaia_documents(module,reference,titre,version) values ('CONSIGNES','consigne:x:v9','pirate',9)$q$) = 'refusé';
select '11 assistante sans droit : modification sans effet (0 ligne)', pg_temp.compte(:'A1', $q$with u as (update bellaia_documents set statut='valide' where module='CONSIGNES' returning 1) select count(*) from u$q$) = 0;
select '12 assistante « accès complet » : lit les consignes (droit voulu)', pg_temp.compte(:'A2', $q$select count(*) from bellaia_documents where module='CONSIGNES'$q$) = 2;
select '13 cliente : aucune consigne visible, écriture refusée', pg_temp.compte(:'C', $q$select count(*) from bellaia_documents where module='CONSIGNES'$q$) = 0 and pg_temp.essai(:'C', $q$insert into bellaia_documents(module,reference,titre) values ('CONSIGNES','consigne:y:v1','x')$q$) = 'refusé';
select '14 hôte BSH : aucune consigne visible', pg_temp.compte(:'H', $q$select count(*) from bellaia_documents where module='CONSIGNES'$q$) = 0;
select '15 visiteur anonyme : rien visible, écriture refusée', pg_temp.compte_anon($q$select count(*) from bellaia_documents$q$) = 0 and pg_temp.essai('', $q$insert into bellaia_documents(module,reference,titre) values ('CONSIGNES','consigne:z:v1','x')$q$) = 'refusé';
select '16 suppression par l''assistante sans droit : sans effet', pg_temp.compte(:'A1', $q$with d as (delete from bellaia_documents where module='CONSIGNES' returning 1) select count(*) from d$q$) = 0 and (select count(*) from bellaia_documents where module='CONSIGNES') = 2;
