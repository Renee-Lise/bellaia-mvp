-- ═══════════════════════════════════════════════════════════
-- 0095_food_catalogue_client_sync_2.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-13
-- Objet : même correctif que la migration 0093, pour les 13
--   articles de la migration 0094 (liqueurs, sirop, punch, gâteaux,
--   quiches) — sans ça, ils resteraient eux aussi invisibles dans
--   le catalogue client (voir 0093 pour l'explication complète).
--   Idempotent (WHERE NOT EXISTS sur recette_id).
-- ═══════════════════════════════════════════════════════════

insert into public.catalogue_produits
  (business_unit, categorie_slug, nom, prix, tva, unite,
   visible_client, disponible, statut, recette_id)
select
  'FOOD', fr.categorie, fr.nom, fr.prix_conseille, 0, 'portion',
  true, true, 'actif', fr.id
from public.food_recettes fr
where fr.notes like 'Affiche envoyée par Renée-Lise le 13/11%'
  and not exists (
    select 1 from public.catalogue_produits cp where cp.recette_id = fr.id
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select count(*) from public.catalogue_produits cp
--   join public.food_recettes fr on fr.id = cp.recette_id
--   where fr.notes like 'Affiche envoyée par Renée-Lise le 13/11%';
--   → attendu : 13.
-- ═══════════════════════════════════════════════════════════
