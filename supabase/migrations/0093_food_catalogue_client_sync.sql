-- ═══════════════════════════════════════════════════════════
-- 0093_food_catalogue_client_sync.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : CORRECTIF IMPORTANT. Tout ce qu'on a ajouté cette session
--   (boissons 0086, barquettes de frites 0087, complément SumUp Food
--   0088, Sweaty-choups 0092) a été inséré dans `food_recettes` —
--   la table de gestion interne des recettes (fiches, coût de
--   revient), jamais lue par ClientFood. Le catalogue réellement
--   affiché aux clientes lit exclusivement `catalogue_produits`
--   (business_unit='FOOD', visible_client=true, disponible=true,
--   statut='actif' — RLS de la migration 0050), une table
--   totalement séparée. C'est pour ça que rien de tout ça
--   n'apparaissait côté client malgré la migration 0091.
-- Cette migration copie chaque article concerné dans
--   catalogue_produits, relié à sa fiche via recette_id (colonne
--   prévue à cet effet depuis la migration 0050), avec le même nom
--   et le même prix. Idempotent (WHERE NOT EXISTS sur recette_id) :
--   rejouable sans dupliquer.
-- Impact : INSERT uniquement dans catalogue_produits ; aucune ligne
--   existante modifiée ou supprimée, food_recettes non touchée.
-- ═══════════════════════════════════════════════════════════

insert into public.catalogue_produits
  (business_unit, categorie_slug, nom, prix, tva, unite,
   visible_client, disponible, statut, recette_id)
select
  'FOOD', fr.categorie, fr.nom, fr.prix_conseille, 0, 'portion',
  true, true, 'actif', fr.id
from public.food_recettes fr
where (
    fr.notes like 'Prix magasin relevé%'
    or fr.notes like 'Prix confirmé par Renée-Lise le 12/11%'
    or fr.notes = 'Prix de caisse SumUp réel — à valider.'
    or fr.notes like 'Affiche envoyée par Renée-Lise le 12/11%'
  )
  and not exists (
    select 1 from public.catalogue_produits cp where cp.recette_id = fr.id
  );

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select count(*) from public.catalogue_produits
--   where business_unit = 'FOOD' and recette_id is not null;
--   → attendu : 79 (9 boissons + 28 frites + 37 SumUp + 5 Sweaty-choups).
--
--   Fonctionnel : ClientFood (côté cliente) doit maintenant afficher
--   ces articles avec leur prix.
-- ═══════════════════════════════════════════════════════════
