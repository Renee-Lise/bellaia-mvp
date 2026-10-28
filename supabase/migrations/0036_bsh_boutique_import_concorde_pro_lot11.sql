-- ═══════════════════════════════════════════════════════════
-- 0036_bsh_boutique_import_concorde_pro_lot11.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (count=319, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 11 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 32 nouveaux articles
--   (variantes préservatifs Pasante, gels/lubrifiants pjur/Exsens/
--   Divine Xtases, sprays Secret Play, coffret massage).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie : "Sextoys & Accessoires" pour les préservatifs,
--   "Aphrodisiaques & Bien-être" pour les gels/lubrifiants/sprays,
--   "Coffrets & Expériences" pour le coffret massage avec livre.
--
-- 5 articles sans "Prix public conseillé" lisible sur leur capture
--   (bouton "Ajouter au panier" juste après le prix HT) : prix_vente
--   laissé NULL, à compléter.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Pasante — Boîte de 12 préservatifs aromatisés (Taste)',     'Sextoys & Accessoires',      135, 7.99,  2.56,  'Import Concorde Pro — Réf 804356 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs en latex Extra',          'Sextoys & Accessoires',      98,  2.50,  0.82,  'Import Concorde Pro — Réf 804355 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs en latex Trim',          'Sextoys & Accessoires',      198, 7.99,  2.56,  'Import Concorde Pro — Réf 804358 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs aromatisés (Taste)',      'Sextoys & Accessoires',      130, 2.50,  0.82,  'Import Concorde Pro — Réf 804357 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs avec texture (Passion Ribbed)', 'Sextoys & Accessoires', 131, 7.99, 2.71, 'Import Concorde Pro — Réf 804400 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs en latex Trim',           'Sextoys & Accessoires',      87,  2.50,  0.82,  'Import Concorde Pro — Réf 804359 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs à texture (Intensity)',  'Sextoys & Accessoires',      162, 7.99,  2.73,  'Import Concorde Pro — Réf 804402 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs avec texture (Passion)',  'Sextoys & Accessoires',      71,  2.50,  0.82,  'Import Concorde Pro — Réf 804401 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs retardants Delay Infinity', 'Sextoys & Accessoires',    0,   4.70,  1.55,  'Import Concorde Pro — Réf 804405 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs à texture (Intensity)',   'Sextoys & Accessoires',      51,  null,  0.82,  'Import Concorde Pro — Réf 804403 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — Boîte de 12 préservatifs phosphorescents (Glow)', 'Sextoys & Accessoires',      98,  null,  8.35,  'Import Concorde Pro — Réf 804407 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — 12 préservatifs effet chaud froid (Climax)',      'Sextoys & Accessoires',      93,  7.99,  2.81,  'Import Concorde Pro — Réf 804406 — PASANTE'),
  ('Pasante — Sachet de 144 préservatifs (Sensitive Feel)',     'Sextoys & Accessoires',      37,  null,  18.47, 'Import Concorde Pro — Réf 804409 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — Boîte de 3 préservatifs phosphorescents (Glow)',  'Sextoys & Accessoires',      268, 5.99,  2.10,  'Import Concorde Pro — Réf 804408 — PASANTE'),
  ('Exsens — Gel de massage comestible chauffant chocolat',     'Aphrodisiaques & Bien-être', 33,  22.00, 7.66,  'Import Concorde Pro — Réf 805085 — EXSENS'),
  ('Plaisir Sucré — Lot de 5+1 huile de massage gourmande chocolat', 'Aphrodisiaques & Bien-être', 26, 23.00, 10.50, 'Import Concorde Pro — Réf 827103 — PLAISIR SUCRÉ'),
  ('Exsens — Gel de massage comestible chauffant pomme d''amour (vert)', 'Aphrodisiaques & Bien-être', 10, 22.00, 7.66, 'Import Concorde Pro — Réf 805087 — EXSENS'),
  ('Exsens — Gel de massage comestible chauffant pomme d''amour (rouge)', 'Aphrodisiaques & Bien-être', 49, 22.00, 7.66, 'Import Concorde Pro — Réf 805086 — EXSENS'),
  ('36 préservatifs extra-fins lubrifiés Lelo Hex',             'Sextoys & Accessoires',      20,  null,  14.62, 'Import Concorde Pro — Réf 517098 — LELO (prix public non visible sur la capture — à compléter)'),
  ('pjur Back Door — Sérum anal anesthésiant',                  'Aphrodisiaques & Bien-être', 18,  20.60, 9.27,  'Import Concorde Pro — Réf 841114 — PJUR'),
  ('Lubrix — Lubrifiant à base d''eau 5ml',                     'Aphrodisiaques & Bien-être', 45,  3.50,  1.22,  'Import Concorde Pro — Réf 800400 — LUBRIX'),
  ('Lelo Hex — 36 préservatifs Respect XL',                     'Sextoys & Accessoires',      8,   34.50, 12.09, 'Import Concorde Pro — Réf 517090 — LELO'),
  ('Lelo Hex — Boîte de 3 préservatifs en latex Original',      'Sextoys & Accessoires',      20,  5.90,  2.73,  'Import Concorde Pro — Réf 517091 — LELO'),
  ('pjur — Pack lubrifiants Original 100ml et Aqua 30ml',       'Aphrodisiaques & Bien-être', 17,  22.95, 8.25,  'Import Concorde Pro — Réf 841115 — PJUR'),
  ('Secret Play — Spray sexe oral fraise acidulée',             'Aphrodisiaques & Bien-être', 22,  9.90,  4.87,  'Import Concorde Pro — Réf 807061 — SECRET PLAY'),
  ('Editions Blanche — Coffret Massages Amoureux avec livre',   'Coffrets & Expériences',     25,  19.99, 10.37, 'Import Concorde Pro — Réf 597103 — EDITIONS BLANCHE'),
  ('Secret Play — Flirty Kiss, pack de 2 gels pour le baiser',  'Aphrodisiaques & Bien-être', 57,  14.90, 6.05,  'Import Concorde Pro — Réf 807063 — SECRET PLAY'),
  ('Secret Play — Spray sexe oral menthe fraîche',              'Aphrodisiaques & Bien-être', 20,  9.90,  4.87,  'Import Concorde Pro — Réf 807062 — SECRET PLAY'),
  ('pjur Organic Touch — Lubrifiant à base d''eau',             'Aphrodisiaques & Bien-être', 25,  17.90, 7.57,  'Import Concorde Pro — Réf 841116 — PJUR'),
  ('Divine Xtases — Relaxant anal lavande 100% BIO',            'Aphrodisiaques & Bien-être', 29,  21.90, 9.90,  'Import Concorde Pro — Réf 805090 — DIVINE XTASES'),
  ('pjur Organic Care — Crème intime régénérante',              'Aphrodisiaques & Bien-être', 29,  19.90, 8.08,  'Import Concorde Pro — Réf 841118 — PJUR'),
  ('pjur Organic Fresh — Mousse nettoyante intime',             'Aphrodisiaques & Bien-être', 19,  15.90, 6.38,  'Import Concorde Pro — Réf 841117 — PJUR')
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
--   → attendu : 319 (287 des lots précédents + 32 de ce lot).
-- ═══════════════════════════════════════════════════════════
