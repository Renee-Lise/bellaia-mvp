-- ═══════════════════════════════════════════════════════════
-- 0040_bsh_nettoyage_catalogue_et_prix.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : deux demandes explicites de Renée-Lise après revue du
--   catalogue importé (lots 0024 à 0039) :
--
--   1. Retirer les tampons Beppy (4 références, migration 0033) et
--      le "Distributeur de gel automatique" (migration 0034) — "on
--      ne l'utilisera pas". Désactivés (statut='inactif') plutôt que
--      supprimés : aucune perte de données, récupérables en
--      repassant statut='actif' si besoin, et getProduitsBSH ne
--      sélectionne que statut='actif' donc ils disparaissent
--      immédiatement de la boutique publique.
--
--   2. Pour tout article déjà importé dont le prix public n'était
--      pas lisible sur sa capture (prix_vente NULL) : fixer
--      prix_vente = prix_achat + 5€, règle donnée explicitement
--      ("rajoute 5€ sur leur prix d'achat pour définir leur prix de
--      vente"). Ne touche que les lignes NULL — tout prix déjà
--      renseigné reste inchangé.
--
-- Impact : 2 UPDATE ciblés sur des lignes déjà importées par les
--   migrations précédentes, idempotents.
-- ═══════════════════════════════════════════════════════════

update public.stocks
set statut = 'inactif'
where univers = 'BSH'
  and notes like 'Import Concorde Pro%'
  and (
    notes like '%Réf 800298%'  -- Beppy Soft Comfort Tampons Wet x4
    or notes like '%Réf 800278%'  -- Beppy Soft Comfort Tampons Dry x8
    or notes like '%Réf 800370%'  -- Beppy Soft Comfort Tampons Dry x4
    or notes like '%Réf 800274%'  -- Beppy Dry Classic x30
    or notes like '%Réf 826185%'  -- Distributeur de gel automatique
  );

update public.stocks
set prix_vente = prix_achat + 5
where univers = 'BSH'
  and notes like 'Import Concorde Pro%'
  and prix_vente is null;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select nom, statut from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--     and (notes like '%BEPPY%' or notes like '%Réf 826185%')
--   order by nom;
--   → attendu : les 4 tampons Beppy + "Distributeur de gel
--     automatique" avec statut='inactif', "Beppy Dry Classic x30"
--     inclus (c'est aussi un tampon).
--
--   select count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%' and prix_vente is null;
--   → attendu : 0 (tous les prix manquants sont maintenant remplis).
-- ═══════════════════════════════════════════════════════════
