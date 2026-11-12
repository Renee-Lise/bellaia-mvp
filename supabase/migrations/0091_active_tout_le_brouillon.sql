-- ═══════════════════════════════════════════════════════════
-- 0091_active_tout_le_brouillon.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : demande explicite — "Mets tout ce qui est dans le
--   brouillon en actif pour qu'ils apparaissent dans les catalogues
--   des différents pôles". Passe en statut 'actif' toutes les lignes
--   actuellement en 'brouillon' dans food_recettes, stocks et
--   catalogue_produits (les 3 tables où ce statut existe) — cela
--   concerne notamment les boissons sans alcool (0086), les
--   barquettes de frites (0087), le complément SumUp Food (0088),
--   les parfums Odyssée (0089), ainsi que tout article antérieur à
--   cette session resté en brouillon.
-- Risque assumé par Renée-Lise : des lignes sans prix connu
--   ("Sur devis"/prix NULL) ou avec des données partielles seront
--   elles aussi activées — c'est la demande explicite, rien n'est
--   filtré ici.
-- Impact : UPDATE uniquement, aucune ligne supprimée, aucune
--   structure modifiée.
-- ═══════════════════════════════════════════════════════════

update public.food_recettes
  set statut = 'actif'
  where statut = 'brouillon';

update public.stocks
  set statut = 'actif'
  where statut = 'brouillon';

update public.catalogue_produits
  set statut = 'actif'
  where statut = 'brouillon';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select count(*) from public.food_recettes where statut='brouillon';
--   select count(*) from public.stocks where statut='brouillon';
--   select count(*) from public.catalogue_produits where statut='brouillon';
--   → attendu : 0 dans les 3 cas.
-- ═══════════════════════════════════════════════════════════
