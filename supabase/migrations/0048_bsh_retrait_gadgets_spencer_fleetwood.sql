-- ═══════════════════════════════════════════════════════════
-- 0048_bsh_retrait_gadgets_spencer_fleetwood.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-29
-- Objet : retrait des articles "gag gift" Spencer-Fleetwood (bonbons
--   en forme suggestive, bijoux factices en bonbon, etc. — lots 7 et
--   13 notamment) du catalogue Concorde Pro importé. Renée-Lise avait
--   demandé mon avis, je recommandais le retrait ; elle a confirmé
--   "d'accord on retire".
--
-- Même logique que la migration 0040 (tampons Beppy, distributeur de
-- gel) : désactivé (statut='inactif'), pas supprimé — aucune perte de
-- donnée, récupérable en repassant statut='actif' si besoin, et
-- disparaît immédiatement de la boutique publique puisque
-- getProduitsBSH ne sélectionne que statut='actif'.
--
-- Impact : 1 UPDATE ciblé sur des lignes déjà importées par les
--   migrations précédentes (0032, 0038 et toute autre contenant la
--   marque dans ses notes), idempotent.
-- ═══════════════════════════════════════════════════════════

update public.stocks
set statut = 'inactif'
where univers = 'BSH'
  and notes like 'Import Concorde Pro%'
  and notes like '%SPENCER-FLEETWOOD%'
  and statut = 'actif';

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) as encore_actifs
--   from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--     and notes like '%SPENCER-FLEETWOOD%' and statut='actif';
--   → attendu : 0 (plus aucun article Spencer-Fleetwood actif).
--
--   select count(*) as desactives
--   from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--     and notes like '%SPENCER-FLEETWOOD%' and statut='inactif';
--   → attendu : > 0 (le nombre réel d'articles retirés — colle-moi
--     ce chiffre, pas besoin de le deviner à l'avance).
-- ═══════════════════════════════════════════════════════════
