-- ═══════════════════════════════════════════════════════════
-- 0089_stocks_parfums_odyssee.sql
-- STATUT : PROPOSITION — à exécuter puis confirmer par Renée-Lise
-- Auteur : Claude Code · Date de rédaction : 2026-11-12
-- Objet : ajoute les 2 parfums de son export SumUp (Yara rose,
--   Yara rose poudré, 50€ chacun) dans `stocks`, univers='ODYSSEE'
--   (déjà une valeur reconnue du filtre univers de l'admin Stocks),
--   catégorie 'Parfums'.
-- Note : elle a indiqué vouloir les rattacher à "Bella'Studio" avec
--   une partie prestation et une partie vente — "Bella'Studio" n'a
--   pas de pôle dédié existant dans l'app aujourd'hui (le nom
--   désigne l'enseigne globale). Cette migration couvre uniquement
--   le stock/vente côté admin (gérable immédiatement via l'admin
--   Stocks générale, univers ODYSSEE) ; la page cliente "vente" et
--   l'emplacement définitif restent à clarifier séparément (voir
--   message de suivi).
-- Impact : additif uniquement (INSERT).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
values
  ('Yara rose', 'Yara rose', 'Parfums', 'ODYSSEE', 0, 2, 50.00, null, 'unité', 'brouillon', 'Prix de caisse SumUp réel — à valider. Prix d''achat non connu.'),
  ('Yara rose poudré', 'Yara rose poudré', 'Parfums', 'ODYSSEE', 0, 2, 50.00, null, 'unité', 'brouillon', 'Prix de caisse SumUp réel — à valider. Prix d''achat non connu.');

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--   select nom, categorie, univers, prix_vente, statut from public.stocks
--   where categorie = 'Parfums';
--   → attendu : 2 lignes.
-- ═══════════════════════════════════════════════════════════
