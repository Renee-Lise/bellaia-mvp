-- Données : A et B actifs et visibles ; C actif mais non coché ; D dans un menu seulement ; offre publiée aujourd'hui (Guyane) = A ; brouillon = C ; hier = B.
insert into public.profiles values ('00000000-0000-0000-0000-0000000000f0', 'F', 'fondatrice', 'actif');
insert into public.catalogue_produits (id, business_unit, nom, prix, allergenes, visible_client, disponible, statut) values
 ('aaaaaaaa-0000-0000-0000-000000000001','FOOD','A',6.5,'{gluten}',true,true,'actif'), ('aaaaaaaa-0000-0000-0000-000000000002','FOOD','B',13,'{céleri}',true,true,'actif'),
 ('aaaaaaaa-0000-0000-0000-000000000003','FOOD','C',3,'{lait}',true,true,'actif'), ('aaaaaaaa-0000-0000-0000-000000000004','FOOD','D',3,'{lait}',true,true,'actif');
insert into public.catalogue_variantes (produit_id, nom, prix, disponible) values ('aaaaaaaa-0000-0000-0000-000000000001','Grande',8,true), ('aaaaaaaa-0000-0000-0000-000000000003','Grande',5,true);
insert into public.food_menu_jour (date, statut, items) values
 ((now() at time zone 'America/Cayenne')::date, 'publie', '[{"cle":"p:a","type":"plat","produit_id":"aaaaaaaa-0000-0000-0000-000000000001","nom":"A"},{"cle":"m:x","type":"menu","nom":"Menu","prix":7,"composition":[{"produit_id":"aaaaaaaa-0000-0000-0000-000000000004","nom":"D"}]},{"nom":"texte libre"}]'),
 ((now() at time zone 'America/Cayenne')::date, 'brouillon', '[{"cle":"p:c","type":"plat","produit_id":"aaaaaaaa-0000-0000-0000-000000000003","nom":"C"}]'),
 ((now() at time zone 'America/Cayenne')::date - 1, 'publie', '[{"cle":"p:b","type":"plat","produit_id":"aaaaaaaa-0000-0000-0000-000000000002","nom":"B"}]');
select '01 anonyme : seul A (coché, publié aujourd''hui) est lisible', pg_temp.compte_anon('select count(*) from public.v_catalogue_food_public') = 1 and pg_temp.compte_anon('select count(*) from public.v_catalogue_food_public where nom=''A''') = 1;
select '02 anonyme : C (brouillon), B (hier), D (menu seul) illisibles', pg_temp.compte_anon('select count(*) from public.v_catalogue_food_public where nom in (''B'',''C'',''D'')') = 0;
select '03 anonyme : variantes de A seulement', pg_temp.compte_anon('select count(*) from public.v_variantes_food_public') = 1;
select '04 cliente connectée : même restriction', pg_temp.compte('00000000-0000-0000-0000-0000000000c1', 'select count(*) from public.v_catalogue_food_public') = 1;
select '05 fondatrice : catalogue complet (4)', pg_temp.compte('00000000-0000-0000-0000-0000000000f0', 'select count(*) from public.v_catalogue_food_public') = 4;
select '06 tables toujours fermées au public', pg_temp.compte_anon('select count(*) from public.catalogue_produits') = 0;
select '07 élément texte libre / identifiant invalide ignoré sans erreur', pg_temp.compte_anon('select count(*) from public.food_offre_produits_du_jour()') = 1;
update public.food_menu_jour set statut = 'brouillon' where statut = 'publie' and date = (now() at time zone 'America/Cayenne')::date;
select '08 offre retirée : plus rien de lisible', pg_temp.compte_anon('select count(*) from public.v_catalogue_food_public') = 0;
