-- ═══════════════════════════════════════════════════════════
-- 0101_food_crepes_fk_17_11.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-17
-- Objet : à sa demande explicite ("garde le prix des crêpes et les
--   crêpes proposées"), reprise du flyer F&K Crêpes (vente du
--   13/11, Sinnamary) comme nouvelle gamme Bella'Food — PAS comme
--   simple référence externe cette fois (contrairement à Sydy
--   Nail's/F&K déjà classés "référence" précédemment dans la
--   conversation, ici elle a explicitement demandé de garder le
--   contenu). 10 articles : 5 à l'unité + 5 en lot de 4, mêmes prix
--   que la fiche source. Pâte à crêpes générique reprise pour tous
--   (le flyer ne donnait pas de recette, seulement menu + prix) ;
--   garniture spécifique par variante.
--   Prix réel donné → synchronisé vers catalogue_produits (comme
--   0087/0088/0093), contrairement aux fiches recettes internes
--   sans prix ajoutées les 14-15/11.
--   Catégorie "crepe" créée (texte libre, pas de contrainte sur
--   food_recettes.categorie).
-- Idempotent (WHERE NOT EXISTS sur nom + notes pour l'insert,
--   sur recette_id pour la synchro catalogue).
-- ═══════════════════════════════════════════════════════════

insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson, ingredients, etapes, prix_conseille, statut, notes)
select v.nom, 'crepe', v.nb_parts, 1, 15, 3, v.ingredients::jsonb,
       ARRAY(SELECT jsonb_array_elements_text(v.etapes::jsonb)), v.prix, 'actif', v.notes
from (values
  ('Crêpe Jambon + Fromage', 1,
   '[{"nom":"Farine","quantite":250,"unite":"g","notes":"pour la pâte, environ 10-12 crêpes"},{"nom":"Œufs","quantite":3,"unite":"piece","notes":"pour la pâte"},{"nom":"Lait","quantite":50,"unite":"cl","notes":"pour la pâte"},{"nom":"Beurre fondu","quantite":25,"unite":"g","notes":"pour la pâte"},{"nom":"Sel","quantite":1,"unite":"pincée","notes":"pour la pâte"},{"nom":"Jambon","quantite":1,"unite":"tranche","notes":"garniture, par crêpe"},{"nom":"Fromage râpé","quantite":30,"unite":"g","notes":"garniture, par crêpe"}]',
   '["Préparez la pâte à crêpes : mélangez farine et sel, incorporez les œufs puis le lait progressivement en fouettant, ajoutez le beurre fondu, laissez reposer 30 minutes.","Faites cuire la crêpe des deux côtés dans une poêle chaude légèrement beurrée.","Garnissez de jambon et de fromage râpé, repliez et faites dorer quelques instants pour faire fondre le fromage."]',
   3.00, 'Prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Crêpe Jambon + Fromage + Béchamel', 1,
   '[{"nom":"Farine","quantite":250,"unite":"g","notes":"pour la pâte, environ 10-12 crêpes"},{"nom":"Œufs","quantite":3,"unite":"piece","notes":"pour la pâte"},{"nom":"Lait","quantite":50,"unite":"cl","notes":"pour la pâte"},{"nom":"Beurre fondu","quantite":25,"unite":"g","notes":"pour la pâte"},{"nom":"Sel","quantite":1,"unite":"pincée","notes":"pour la pâte"},{"nom":"Jambon","quantite":1,"unite":"tranche","notes":"garniture, par crêpe"},{"nom":"Fromage râpé","quantite":30,"unite":"g","notes":"garniture, par crêpe"},{"nom":"Béchamel","quantite":2,"unite":"c. à soupe","notes":"garniture, par crêpe"}]',
   '["Préparez la pâte à crêpes : mélangez farine et sel, incorporez les œufs puis le lait progressivement en fouettant, ajoutez le beurre fondu, laissez reposer 30 minutes.","Faites cuire la crêpe des deux côtés dans une poêle chaude légèrement beurrée.","Garnissez de jambon, de fromage râpé et de béchamel, repliez et faites dorer quelques instants."]',
   3.50, 'Prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Crêpe Lardon + Fromage + Béchamel', 1,
   '[{"nom":"Farine","quantite":250,"unite":"g","notes":"pour la pâte, environ 10-12 crêpes"},{"nom":"Œufs","quantite":3,"unite":"piece","notes":"pour la pâte"},{"nom":"Lait","quantite":50,"unite":"cl","notes":"pour la pâte"},{"nom":"Beurre fondu","quantite":25,"unite":"g","notes":"pour la pâte"},{"nom":"Sel","quantite":1,"unite":"pincée","notes":"pour la pâte"},{"nom":"Lardons","quantite":40,"unite":"g","notes":"garniture, par crêpe, revenus à la poêle"},{"nom":"Fromage râpé","quantite":30,"unite":"g","notes":"garniture, par crêpe"},{"nom":"Béchamel","quantite":2,"unite":"c. à soupe","notes":"garniture, par crêpe"}]',
   '["Préparez la pâte à crêpes : mélangez farine et sel, incorporez les œufs puis le lait progressivement en fouettant, ajoutez le beurre fondu, laissez reposer 30 minutes.","Faites revenir les lardons à sec dans une poêle.","Faites cuire la crêpe des deux côtés, garnissez de lardons, fromage râpé et béchamel, repliez et faites dorer quelques instants."]',
   4.00, 'Prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Crêpe Nutella', 1,
   '[{"nom":"Farine","quantite":250,"unite":"g","notes":"pour la pâte, environ 10-12 crêpes"},{"nom":"Œufs","quantite":3,"unite":"piece","notes":"pour la pâte"},{"nom":"Lait","quantite":50,"unite":"cl","notes":"pour la pâte"},{"nom":"Sucre","quantite":30,"unite":"g","notes":"pour la pâte"},{"nom":"Beurre fondu","quantite":25,"unite":"g","notes":"pour la pâte"},{"nom":"Pâte à tartiner chocolat/noisette","quantite":2,"unite":"c. à soupe","notes":"garniture, par crêpe"}]',
   '["Préparez la pâte à crêpes sucrée : mélangez farine et sucre, incorporez les œufs puis le lait progressivement en fouettant, ajoutez le beurre fondu, laissez reposer 30 minutes.","Faites cuire la crêpe des deux côtés dans une poêle chaude légèrement beurrée.","Tartinez de pâte à tartiner chocolat/noisette et pliez."]',
   1.50, 'Prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Crêpe Nutella + Chantilly', 1,
   '[{"nom":"Farine","quantite":250,"unite":"g","notes":"pour la pâte, environ 10-12 crêpes"},{"nom":"Œufs","quantite":3,"unite":"piece","notes":"pour la pâte"},{"nom":"Lait","quantite":50,"unite":"cl","notes":"pour la pâte"},{"nom":"Sucre","quantite":30,"unite":"g","notes":"pour la pâte"},{"nom":"Beurre fondu","quantite":25,"unite":"g","notes":"pour la pâte"},{"nom":"Pâte à tartiner chocolat/noisette","quantite":2,"unite":"c. à soupe","notes":"garniture, par crêpe"},{"nom":"Chantilly","quantite":1,"unite":"c. à soupe","notes":"garniture, par crêpe"}]',
   '["Préparez la pâte à crêpes sucrée : mélangez farine et sucre, incorporez les œufs puis le lait progressivement en fouettant, ajoutez le beurre fondu, laissez reposer 30 minutes.","Faites cuire la crêpe des deux côtés dans une poêle chaude légèrement beurrée.","Tartinez de pâte à tartiner chocolat/noisette, pliez et ajoutez une rosace de chantilly."]',
   2.00, 'Prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Lot de 4 crêpes Jambon + Fromage', 4,
   '[{"nom":"Crêpe Jambon + Fromage","quantite":4,"unite":"piece","notes":"voir fiche unitaire pour la composition d''une crêpe"}]',
   '["Préparer 4 crêpes Jambon + Fromage selon la fiche unitaire, conditionner ensemble."]',
   7.50, 'Lot de 4 — prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Lot de 4 crêpes Jambon + Fromage + Béchamel', 4,
   '[{"nom":"Crêpe Jambon + Fromage + Béchamel","quantite":4,"unite":"piece","notes":"voir fiche unitaire pour la composition d''une crêpe"}]',
   '["Préparer 4 crêpes Jambon + Fromage + Béchamel selon la fiche unitaire, conditionner ensemble."]',
   8.50, 'Lot de 4 — prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Lot de 4 crêpes Lardon + Fromage + Béchamel', 4,
   '[{"nom":"Crêpe Lardon + Fromage + Béchamel","quantite":4,"unite":"piece","notes":"voir fiche unitaire pour la composition d''une crêpe"}]',
   '["Préparer 4 crêpes Lardon + Fromage + Béchamel selon la fiche unitaire, conditionner ensemble."]',
   9.50, 'Lot de 4 — prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Lot de 4 crêpes Nutella', 4,
   '[{"nom":"Crêpe Nutella","quantite":4,"unite":"piece","notes":"voir fiche unitaire pour la composition d''une crêpe"}]',
   '["Préparer 4 crêpes Nutella selon la fiche unitaire, conditionner ensemble."]',
   5.50, 'Lot de 4 — prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.'),
  ('Lot de 4 crêpes Nutella + Chantilly', 4,
   '[{"nom":"Crêpe Nutella + Chantilly","quantite":4,"unite":"piece","notes":"voir fiche unitaire pour la composition d''une crêpe"}]',
   '["Préparer 4 crêpes Nutella + Chantilly selon la fiche unitaire, conditionner ensemble."]',
   6.50, 'Lot de 4 — prix et composition repris du flyer F&K Crêpes (vente du 13/11, Sinnamary) — gardés tels quels à la demande de Renée-Lise.')
) as v(nom, nb_parts, ingredients, etapes, prix, notes)
where not exists (
  select 1 from public.food_recettes fr where fr.nom = v.nom and fr.notes = v.notes
);

-- Synchronisation catalogue client (même principe que 0093/0096)
insert into public.catalogue_produits
  (business_unit, categorie_slug, nom, prix, tva, unite,
   visible_client, disponible, statut, recette_id)
select
  'FOOD', fr.categorie, fr.nom, fr.prix_conseille, 0, 'portion',
  true, true, 'actif', fr.id
from public.food_recettes fr
where fr.notes ilike '%flyer F&K Crêpes%'
  and not exists (
    select 1 from public.catalogue_produits cp where cp.recette_id = fr.id
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select count(*) from public.food_recettes
--   where notes ilike '%flyer F&K Crêpes%';
--   → attendu : 10.
--   select count(*) from public.catalogue_produits cp
--   join public.food_recettes fr on fr.id = cp.recette_id
--   where fr.notes ilike '%flyer F&K Crêpes%';
--   → attendu : 10.
-- ═══════════════════════════════════════════════════════════
