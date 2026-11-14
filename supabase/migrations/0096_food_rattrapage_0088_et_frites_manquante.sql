-- ═══════════════════════════════════════════════════════════
-- 0096_food_rattrapage_0088_et_frites_manquante.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-14
-- Objet : rattrapage après vérification directe en base (via l'outil
--   Supabase) de ce que les migrations précédentes ont réellement
--   produit :
--   1. La migration 0088 (37 articles SumUp Food) n'avait en fait
--      jamais été collée/exécutée — 0 ligne trouvée en base. Reprise
--      ici, directement en statut 'actif' (plus besoin du double
--      passage brouillon→actif de la 0091, déjà faite).
--   2. La migration 0087 (barquettes de frites) a inséré 27 lignes
--      au lieu de 28 : "Barquette de frites maison" (seule, sans
--      garniture, 5€) manquait. Ajoutée ici.
--   3. Les parfums Odyssée (migration 0089) existent en double
--      (Yara rose / Yara rose poudré × 2) — probablement rejouée une
--      deuxième fois en recollant tout le lot 0089→0095. Nettoyage :
--      suppression d'un exemplaire de chaque, garde le plus ancien.
--   4. Synchronisation catalogue_produits (même principe que 0093)
--      pour les deux premiers points, sinon invisibles côté client.
-- Idempotent pour les parties 1, 2, 4 (clauses NOT EXISTS / clé de
--   notes distinctive) ; la partie 3 (DELETE ciblé par id) ne
--   s'applique qu'une fois, sans risque si rejouée (ids déjà
--   supprimés = 0 ligne affectée).
-- ═══════════════════════════════════════════════════════════

-- 1. Les 37 articles SumUp Food (migration 0088, jamais exécutée)
insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
select v.nom, v.categorie, v.nb_parts, v.difficulte, v.temps_prepa, v.temps_cuisson,
       '[]'::jsonb, '{}'::text[], v.prix, 'actif', 'Prix de caisse SumUp réel — à valider.'
from (values
  ('Mini pizza', 'entree', 1, 1, 10, 10, 3.00),
  ('Mini quiche', 'entree', 1, 1, 10, 15, 3.00),
  ('Tartelette', 'entree', 1, 1, 10, 10, 3.00),
  ('Riz cantonais nature', 'riz', 1, 1, 15, 15, 6.50),
  ('Riz cantonais au poulet', 'riz', 1, 1, 15, 15, 7.50),
  ('Soupe créole', 'soupe', 1, 2, 20, 40, 13.00),
  ('Soupe z''habitants', 'soupe', 1, 2, 20, 40, 13.00),
  ('Hamburger standard', 'burger', 1, 1, 10, 10, 7.00),
  ('Cheese burger', 'burger', 1, 1, 10, 10, 7.50),
  ('Triple cheese burger', 'burger', 1, 1, 10, 10, 8.50),
  ('Double cheese burger', 'burger', 1, 1, 10, 10, 9.50),
  ('Double burger', 'burger', 1, 1, 10, 10, 8.50),
  ('Triple burger', 'burger', 1, 1, 10, 10, 9.50),
  ('Brochette de bœuf', 'street_food', 1, 1, 10, 15, 3.50),
  ('Brochette de poulet', 'street_food', 1, 1, 10, 15, 3.50),
  ('Gratin de pâtes au fromage sans viande', 'pates', 1, 1, 15, 25, 8.50),
  ('Gratin de pâtes au fromage, poulet', 'pates', 1, 1, 15, 25, 10.50),
  ('Gratin de pâtes au fromage, bœuf', 'pates', 1, 1, 15, 25, 12.50),
  ('Jus de gingembre', 'jus', 1, 1, 10, 0, 3.00),
  ('Jus de gingembre curcuma', 'jus', 1, 1, 10, 0, 3.00),
  ('Jus de groseille', 'jus', 1, 1, 10, 0, 3.00),
  ('Jus de canne à sucre (0,33cl)', 'jus', 1, 1, 10, 0, 3.50),
  ('Jus de canne à sucre (1L)', 'jus', 1, 1, 10, 0, 7.00),
  ('Jus de canne à sucre (timbale)', 'jus', 1, 1, 10, 0, 3.00),
  ('Thé glacé au gingembre', 'the_glace', 1, 1, 10, 0, 2.50),
  ('Thé glacé à la citronnelle', 'the_glace', 1, 1, 10, 0, 2.50),
  ('Thé glacé à la menthe', 'the_glace', 1, 1, 10, 0, 2.50),
  ('Milkshake caramel', 'boisson', 1, 1, 10, 0, 5.00),
  ('Milkshake vanille', 'boisson', 1, 1, 10, 0, 5.00),
  ('Milkshake fraise', 'boisson', 1, 1, 10, 0, 5.00),
  ('Milkshake café', 'boisson', 1, 1, 10, 0, 5.00),
  ('Milkshake chocolat', 'boisson', 1, 1, 10, 0, 5.00),
  ('Crème de cupuaçu', 'dessert', 1, 1, 15, 0, 4.00),
  ('Mousse de cupuaçu', 'dessert', 1, 1, 15, 0, 5.50),
  ('Mousse maracujà', 'dessert', 1, 1, 15, 0, 5.50),
  ('Mousse moubin', 'dessert', 1, 1, 15, 0, 5.50),
  ('Mousse au chocolat', 'dessert', 1, 1, 15, 0, 4.50),
  ('Mousse café', 'dessert', 1, 1, 15, 0, 4.50)
) as v(nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson, prix)
where not exists (
  select 1 from public.food_recettes fr
  where fr.nom = v.nom and fr.notes = 'Prix de caisse SumUp réel — à valider.'
);

-- 2. La barquette manquante
insert into public.food_recettes
  (nom, categorie, nb_parts, difficulte, temps_prepa, temps_cuisson,
   ingredients, etapes, prix_conseille, statut, notes)
select 'Barquette de frites maison', 'street_food', 1, 1, 15, 10, '[]'::jsonb, '{}'::text[], 5.00, 'actif',
       'Prix confirmé par Renée-Lise le 12/11.'
where not exists (
  select 1 from public.food_recettes where nom = 'Barquette de frites maison'
);

-- 3. Nettoyage des parfums Odyssée en double
delete from public.stocks
where id in ('e380bb34-7ee2-46d1-9ccd-25b7bd6c7df2', 'cb98671d-c653-4b4d-ba83-eda2ec644554');

-- 4. Synchronisation catalogue client (même principe que 0093)
insert into public.catalogue_produits
  (business_unit, categorie_slug, nom, prix, tva, unite,
   visible_client, disponible, statut, recette_id)
select
  'FOOD', fr.categorie, fr.nom, fr.prix_conseille, 0, 'portion',
  true, true, 'actif', fr.id
from public.food_recettes fr
where (
    fr.notes = 'Prix de caisse SumUp réel — à valider.'
    or fr.nom = 'Barquette de frites maison'
  )
  and not exists (
    select 1 from public.catalogue_produits cp where cp.recette_id = fr.id
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select count(*) from public.food_recettes where notes = 'Prix de caisse SumUp réel — à valider.';
--   → attendu : 37.
--   select count(*) from public.food_recettes where nom = 'Barquette de frites maison';
--   → attendu : 1.
--   select count(*) from public.stocks where categorie='Parfums' and univers='ODYSSEE';
--   → attendu : 2.
-- ═══════════════════════════════════════════════════════════
