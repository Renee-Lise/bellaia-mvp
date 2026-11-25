-- 0148 boutique numérique (personnes fictives). Chaque ligne doit afficher « t ».
\set F '00000000-0000-0000-0000-0000000000f1'
\set A '00000000-0000-0000-0000-0000000000a1'
\set X '00000000-0000-0000-0000-0000000000c9'
\set P '00000000-0000-0000-0000-00000000e001'
\set S '00000000-0000-0000-0000-00000000e101'
select set_config('request.jwt.claims', '{}', false);
insert into auth.users (id, email) values (:'F','f@exemple.invalid'), (:'A','a@exemple.invalid'), (:'X','x@exemple.invalid') on conflict do nothing;
insert into public.profiles (id, prenom, role) values (:'F','Fondatrice','fondatrice'), (:'A','Acheteuse','cliente'), (:'X','Autre','cliente') on conflict (id) do update set role = excluded.role;
insert into public.catalogue_produits (id, reference, business_unit, nom, prix, type_produit, fichier_chemin, apercu_chemin, version_fichier, visible_client, disponible, statut)
  values (:'P', 'ED-TEST-1', 'EDITIONS', 'Guide fictif', 9.90, 'numerique', 'editions/guide-v1.pdf', 'editions/guide-apercu.pdf', 'v1', true, true, 'publie');
insert into public.stripe_payment_intents (id, client_id, client_nom, client_email, module, montant_total_cts, devise, statut, stripe_checkout_session_id, items_json)
  values (:'S', :'A', 'Acheteuse', 'a@exemple.invalid', 'boutique', 990, 'eur', 'en_attente', 'cs_test_fictif', jsonb_build_array(jsonb_build_object('produit_id', :'P', 'prix_cts', 990)));
insert into public.bellaia_compteurs (prefixe, annee, dernier) values ('FAC', extract(year from now())::int, 41) on conflict (prefixe, annee) do update set dernier = 41;
insert into storage.objects (bucket_id, name) values ('boutique-fichiers', 'editions/guide-v1.pdf'), ('boutique-apercus', 'editions/guide-apercu.pdf');
select '01 une cliente ne peut pas s''attribuer un droit en appelant la fonction serveur', pg_temp.essai(:'A', format($q$select public.boutique_accorder_droits(%L, 'evt_pirate')$q$, :'S')) = 'refusé';
select public.boutique_accorder_droits(:'S', 'evt_1') is not null as accorde \gset
select '02 paiement confirmé : facture dans la numérotation existante (FAC-année-0042)', (select reference from bellaia_factures where id = (select facture_id from boutique_droits where paiement_stripe_id = :'S')) = 'FAC-' || extract(year from now())::int || '-0042'
union all select '03 droit accordé à l''acheteuse au prix payé, version notée', (select count(*) from boutique_droits where user_id = :'A' and produit_id = :'P' and prix_paye_cts = 990 and version_achetee = 'v1' and revoque_le is null) = 1
union all select '04 paiement enregistré (montant, Stripe) et commande passée « payée »', (select count(*) from bellaia_paiements where module = 'boutique' and montant = 9.90 and provider = 'stripe') = 1 and (select statut from stripe_payment_intents where id = :'S') = 'paye';
select public.boutique_accorder_droits(:'S', 'evt_1') as r1 \gset
select public.boutique_accorder_droits(:'S', 'evt_2') as r2 \gset
select '05 webhook reçu plusieurs fois : aucune seconde facture, aucun second droit, compteur inchangé', (select count(*) from bellaia_factures where business_unit = 'BOUTIQUE') = 1 and (select count(*) from boutique_droits) = 1 and (select dernier from bellaia_compteurs where prefixe = 'FAC' and annee = extract(year from now())::int) = 42
union all select '06 même événement Stripe enregistré une seule fois', (select count(*) from stripe_payment_history where stripe_event_id = 'evt_1') = 1
union all select '07 l''acheteuse voit son achat dans sa bibliothèque', pg_temp.compte(:'A', 'select count(*) from boutique_droits') = 1
union all select '08 une autre cliente ne voit pas cet achat', pg_temp.compte(:'X', 'select count(*) from boutique_droits') = 0
union all select '09 un visiteur ne voit rien', pg_temp.compte_anon('select count(*) from boutique_droits') <= 0
union all select '10 téléchargement autorisé à l''acheteuse (chemin du fichier rendu, téléchargement journalisé)', pg_temp.essai(:'A', format($q$select public.boutique_noter_telechargement(%L)$q$, :'P')) = 'accepté'
union all select '11 téléchargement refusé à une autre cliente', pg_temp.essai(:'X', format($q$select public.boutique_noter_telechargement(%L)$q$, :'P')) = 'refusé'
union all select '12 l''acheteuse ne peut pas créer un droit elle-même', pg_temp.essai(:'A', format($q$insert into boutique_droits (user_id, produit_id, prix_paye_cts) values (%L, %L, 0)$q$, :'A', :'P')) = 'refusé'
union all select '13 fichier payant : aucun accès direct au compartiment privé (acheteuse comprise)', pg_temp.compte(:'A', $q$select count(*) from storage.objects where bucket_id = 'boutique-fichiers'$q$) = 0
union all select '14 aperçu gratuit lisible par un visiteur', pg_temp.compte_anon($q$select count(*) from storage.objects where bucket_id = 'boutique-apercus'$q$) = 1
union all select '15 la fondatrice voit les fichiers et les achats', pg_temp.compte(:'F', $q$select count(*) from storage.objects where bucket_id = 'boutique-fichiers'$q$) = 1 and pg_temp.compte(:'F', 'select count(*) from boutique_droits') = 1;
select public.boutique_retirer_droits(:'S', 'evt_r1', 'Remboursement total') as k \gset
select '16 remboursement : droit révoqué (conservé pour l''historique), commande « remboursée »', (select count(*) from boutique_droits where revoque_le is not null) = 1 and (select statut from stripe_payment_intents where id = :'S') = 'rembourse'
union all select '17 après remboursement, le téléchargement est refusé', pg_temp.essai(:'A', format($q$select public.boutique_noter_telechargement(%L)$q$, :'P')) = 'refusé'
union all select '18 la facture et le paiement restent (pièces comptables)', (select count(*) from bellaia_factures where business_unit = 'BOUTIQUE') = 1 and (select count(*) from bellaia_paiements where module = 'boutique') = 1
union all select '19 type de produit invalide refusé par la base', pg_temp.essai(:'F', $q$update catalogue_produits set type_produit = 'autre' where reference = 'ED-TEST-1'$q$) = 'refusé'
union all select '20 public « adulte » accepté, valeur inconnue refusée', pg_temp.essai(:'F', $q$update catalogue_produits set public_age = 'adulte' where reference = 'ED-TEST-1'$q$) = 'accepté' and pg_temp.essai(:'F', $q$update catalogue_produits set public_age = 'enfants' where reference = 'ED-TEST-1'$q$) = 'refusé';
