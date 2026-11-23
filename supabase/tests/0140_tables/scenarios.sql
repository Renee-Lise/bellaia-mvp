\set F '00000000-0000-0000-0000-0000000000f1'
\set A1 '00000000-0000-0000-0000-0000000000a1'
\set A2 '00000000-0000-0000-0000-0000000000a2'
\set C '00000000-0000-0000-0000-0000000000c1'
select '01 fondatrice crée une notification (comme creerNotification)', pg_temp.essai(:'F', $q$insert into notifications(reference,pole,type_notification,titre,message,canal,statut,source_table,source_id) values ('NOTIF-1','ODYSSEE','nouvelle_demande','Nouveau RDV','Client : X','interne','a_envoyer','bellaia_commandes','BO-1')$q$);
select '02 fondatrice la lit et la marque lue', pg_temp.compte(:'F', $q$with u as (update notifications set statut='lu', date_envoi=now() returning 1) select count(*) from u$q$) = 1;
select '03 cliente : création refusée, rien visible', pg_temp.essai(:'C', $q$insert into notifications(titre) values ('spam')$q$) = 'refusé' and pg_temp.compte(:'C', $q$select count(*) from notifications$q$) = 0;
select '04 assistante sans droit : rien visible', pg_temp.compte(:'A1', $q$select count(*) from notifications$q$) = 0;
select '05 assistante « accès complet » : voit la notification', pg_temp.compte(:'A2', $q$select count(*) from notifications$q$) = 1;
select '06 anonyme : aucun accès aux 3 tables', pg_temp.compte_anon($q$select count(*) from notifications$q$) = -1 and pg_temp.compte_anon($q$select count(*) from webhook_logs$q$) = -1 and pg_temp.compte_anon($q$select count(*) from pre_comptabilite$q$) = -1;
-- Écritures « serveur » (clé de service = propriétaire, hors règles d'accès)
insert into webhook_logs(provider,event_type,event_id,payload,statut) values ('SumUp','CHECKOUT_STATUS_CHANGED','chk_1','{}','recu');
update webhook_logs set statut='traite', traite_le=now() where event_id='chk_1';
select '07 anti-doublon : l''événement traité est retrouvé (requête du webhook)', (select count(*) from webhook_logs where event_id='chk_1' and statut='traite') = 1;
insert into pre_comptabilite(date,libelle,type_operation,journal,pole,mode_paiement,montant_ht,tva,montant_ttc,statut,source,valide_le) values (current_date,'SumUp – test','vente_produit','ventes','FOOD','SumUp',10,0,10,'auto_valide','auto',now());
select '08 écriture comptable enregistrée (colonnes du code)', (select count(*) from pre_comptabilite) = 1;
select '09 cliente : aucune écriture comptable ni journal visible', pg_temp.compte(:'C', $q$select count(*) from pre_comptabilite$q$) = 0 and pg_temp.compte(:'C', $q$select count(*) from webhook_logs$q$) = 0;
select '10 journal de paiement : écriture par un compte connecté refusée', pg_temp.essai(:'F', $q$insert into webhook_logs(provider,event_id) values ('x','y')$q$) = 'refusé';
select '11 canal invalide refusé', pg_temp.essai(:'F', $q$insert into notifications(titre,canal) values ('x','pigeon')$q$) = 'refusé';
