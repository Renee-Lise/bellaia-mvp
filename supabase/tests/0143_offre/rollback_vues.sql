create or replace view public.v_catalogue_food_public as
 SELECT id, nom, categorie_slug, sous_categorie, description_courte, prix, prix_promotion, tags, galerie_photos, allergenes, ordre, business_unit,
    food_produit_commandable(id, allergenes, recette_id) AS commandable,
    CASE WHEN food_produit_commandable(id, allergenes, recette_id) THEN NULL::text ELSE 'Fiche produit en cours de finalisation'::text END AS mention
   FROM catalogue_produits p
  WHERE business_unit = 'FOOD'::text AND visible_client AND disponible AND statut = 'actif'::text;
create or replace view public.v_variantes_food_public as
 SELECT v.id, v.produit_id, v.nom, v.prix, v.disponible
   FROM catalogue_variantes v JOIN catalogue_produits p ON p.id = v.produit_id
  WHERE v.disponible AND p.business_unit = 'FOOD'::text AND p.visible_client AND p.disponible AND p.statut = 'actif'::text;
