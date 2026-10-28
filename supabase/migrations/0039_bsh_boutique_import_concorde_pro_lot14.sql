-- ═══════════════════════════════════════════════════════════
-- 0039_bsh_boutique_import_concorde_pro_lot14.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 14 (dernier de la soirée)
--   de captures d'écran Concorde Pro envoyées par Renée-Lise.
--   8 nouveaux articles : jeux de société Kheper Games, accessoire
--   BDSM Sweet Caress, gadgets Fun Novelties.
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie : "BDSM & Contraintes" pour le jeu Bondage Seductions
--   et la cravache, "Coffrets & Expériences" pour le reste (jeux de
--   société, gadgets).
--
-- 1 article sans "Prix public conseillé" lisible sur sa capture
--   (bouton "Ajouter au panier" juste après le prix HT) : prix_vente
--   laissé NULL.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Bondage Seductions Game',                 'BDSM & Contraintes',     0,   27.90, 11.72, 'Import Concorde Pro — Réf 596006 — KHEPER GAMES'),
  ('4 Play Game',                              'Coffrets & Expériences', 0,   12.90, 4.96,  'Import Concorde Pro — Réf 596005 — KHEPER GAMES'),
  ('The Oral Sex Game',                       'Coffrets & Expériences', 0,   16.50, 7.04,  'Import Concorde Pro — Réf 596004 — KHEPER GAMES'),
  ('Sex International Card Game',             'Coffrets & Expériences', 0,   8.90,  4.37,  'Import Concorde Pro — Réf 596000 — KHEPER GAMES'),
  ('Cravache BDSM — Tapette cœur noir et plumeau rouge', 'BDSM & Contraintes', 0, 16.90, 3.42, 'Import Concorde Pro — Réf 570073 — SWEET CARESS'),
  ('Sex Ice Maker — Bac à glaçons',            'Coffrets & Expériences', 157, 3.30,  0.91,  'Import Concorde Pro — Réf 569001 — FUN NOVELTIES'),
  ('Birthday Party Candle',                   'Coffrets & Expériences', 0,   3.60,  1.09,  'Import Concorde Pro — Réf 520326 — FUN NOVELTIES'),
  ('Dicky Shipping Straws',                   'Coffrets & Expériences', 348, null,  1.37,  'Import Concorde Pro — Réf 520254 — FUN NOVELTIES (prix public non visible sur la capture — à compléter)')
) as v(nom, categorie, quantite, prix_vente, prix_achat, notes)
where not exists (
  select 1 from public.stocks s
  where s.univers = 'BSH' and s.notes = v.notes
);

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%';
--   → attendu : 390 (382 des lots précédents + 8 de ce lot).
-- ═══════════════════════════════════════════════════════════
