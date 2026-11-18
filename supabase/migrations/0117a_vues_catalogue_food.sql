-- ═══════════════════════════════════════════════════════════
-- 0117a_vues_catalogue_food.sql
-- STATUT: PRÉPARÉ — AJOUTS à exécuter AVANT la mise en ligne (sans effet
-- sur la boutique actuelle) : vues publiques Bella'Food sans coût de
-- revient, marge ni taux de marge. Les conditions de visibilité seront
-- vérifiées contre les règles publiques existantes avant exécution.
-- ═══════════════════════════════════════════════════════════
create or replace view public.v_catalogue_food_public as
  select p.id, p.nom, p.categorie_slug, p.sous_categorie, p.description_courte, p.prix, p.prix_promotion, p.tags, p.galerie_photos, p.allergenes, p.ordre, p.business_unit
  from public.catalogue_produits p
  where p.business_unit = 'FOOD' and p.visible_client and p.statut = 'actif';
create or replace view public.v_variantes_food_public as
  select v.id, v.produit_id, v.nom, v.prix, v.disponible
  from public.catalogue_variantes v join public.catalogue_produits p on p.id = v.produit_id
  where v.disponible and p.business_unit = 'FOOD' and p.visible_client and p.statut = 'actif';
grant select on public.v_catalogue_food_public, public.v_variantes_food_public to anon, authenticated;
