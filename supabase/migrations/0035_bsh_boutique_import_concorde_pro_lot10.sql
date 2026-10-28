-- ═══════════════════════════════════════════════════════════
-- 0035_bsh_boutique_import_concorde_pro_lot10.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 10 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 29 nouveaux articles
--   (bougies cœur, lubrifiants pjur/Power Fist, préservatifs
--   Lelo Hex/Sensitex/Pasante, poire à lavement, nettoyant sextoys).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie : "Aphrodisiaques & Bien-être" pour les bougies/
--   lubrifiants/gels, "Sextoys & Accessoires" pour les
--   préservatifs, la poire à lavement et les produits d'entretien
--   sextoys pjur.
--
-- ⚠️ Un article de ce lot n'a PAS été importé : "Présentoir
--   boutique bougies Plaisir Secret" (Réf 212013, 20,00€ HT) — ce
--   n'est pas un produit à vendre mais un meuble/PLV de présentation
--   en magasin. Dis-moi si tu veux quand même le commander (ce
--   serait alors un achat d'équipement, pas un article de stock).
--
-- 9 articles sans "Prix public conseillé" lisible sur leur capture
--   (bouton "Ajouter au panier" juste après le prix HT) : prix_vente
--   laissé NULL, à compléter.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Plaisir Secret — Bougie de massage cœur noix de coco 35ml', 'Aphrodisiaques & Bien-être', 242, null,  3.03,  'Import Concorde Pro — Réf 826065 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage cœur fraise 35ml',       'Aphrodisiaques & Bien-être', 0,   null,  3.03,  'Import Concorde Pro — Réf 826064 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage cœur fruits exotiques 35ml', 'Aphrodisiaques & Bien-être', 320, null, 3.03, 'Import Concorde Pro — Réf 826067 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage cœur mojito 35ml',       'Aphrodisiaques & Bien-être', 247, null,  3.03,  'Import Concorde Pro — Réf 826066 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage cœur pêche de vigne 35ml', 'Aphrodisiaques & Bien-être', 0, null,  3.03,  'Import Concorde Pro — Réf 826069 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage cœur caramel 35ml',      'Aphrodisiaques & Bien-être', 0,   null,  3.03,  'Import Concorde Pro — Réf 826068 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Coffret Massage Privé (bougie et huiles)', 'Aphrodisiaques & Bien-être', 18,  null,  7.32,  'Import Concorde Pro — Réf 826077 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Lubrix — Gel lubrifiant anal 50ml',                         'Aphrodisiaques & Bien-être', 6,   null,  2.31,  'Import Concorde Pro — Réf 800068 — LUBRIX (prix public non visible sur la capture — à compléter)'),
  ('pjur Infinity — Lubrifiant à base d''eau 50ml',             'Aphrodisiaques & Bien-être', 28,  null,  13.53, 'Import Concorde Pro — Réf 841106 — PJUR (prix public non visible sur la capture — à compléter)'),
  ('Poire à lavement bleue 310ml',                              'Sextoys & Accessoires',      610, 17.90, 3.90,  'Import Concorde Pro — Réf 571018 — SHOWERPLAY'),
  ('pjur Infinity — Lubrifiant à base de silicone 50ml',        'Aphrodisiaques & Bien-être', 46,  24.90, 13.59, 'Import Concorde Pro — Réf 841107 — PJUR'),
  ('Power Fist — Gel lubrifiant spécial fortes stimulations 500ml', 'Aphrodisiaques & Bien-être', 509, 23.90, 7.23, 'Import Concorde Pro — Réf 800156 — POWER FIST'),
  ('Power Fist — Gel lubrifiant spécial fortes stimulations 250ml', 'Aphrodisiaques & Bien-être', 212, 14.90, 4.40, 'Import Concorde Pro — Réf 800155 — POWER FIST'),
  ('Lelo Hex — 12 préservatifs XL en latex lubrifiés',          'Sextoys & Accessoires',      13,  13.90, 6.40,  'Import Concorde Pro — Réf 517095 — LELO'),
  ('Lelo Hex — 12 préservatifs en latex lubrifiés (Original)',  'Sextoys & Accessoires',      15,  13.90, 6.23,  'Import Concorde Pro — Réf 517092 — LELO'),
  ('Sensitex — Boîte de 144 préservatifs Natural',              'Sextoys & Accessoires',      40,  35.90, 15.90, 'Import Concorde Pro — Réf 804330 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs King Size',            'Sextoys & Accessoires',      26,  42.50, 21.50, 'Import Concorde Pro — Réf 804331 — SENSITEX'),
  ('pjur Toy Foam — Mousse nettoyante pour sextoys 150ml',      'Sextoys & Accessoires',      16,  19.90, 7.23,  'Import Concorde Pro — Réf 841112 — PJUR'),
  ('pjur Toy Glide — Lubrifiant spécial sextoys à base d''eau 100ml', 'Sextoys & Accessoires', 17, null, 8.49, 'Import Concorde Pro — Réf 841111 — PJUR (prix public non visible sur la capture — à compléter)'),
  ('Pasante — Boîte de 144 préservatifs en latex Regular',      'Sextoys & Accessoires',      28,  null,  18.71, 'Import Concorde Pro — Réf 804411 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — 144 préservatifs en latex Regular (sachet)',      'Sextoys & Accessoires',      66,  null,  17.15, 'Import Concorde Pro — Réf 804410 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — Boîte de 3 préservatifs en latex King Size',      'Sextoys & Accessoires',      200, 2.50,  0.86,  'Import Concorde Pro — Réf 804413 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs en latex King Size',     'Sextoys & Accessoires',      138, 7.99,  2.89,  'Import Concorde Pro — Réf 804412 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs en latex Regular',       'Sextoys & Accessoires',      150, 7.99,  2.38,  'Import Concorde Pro — Réf 804350 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs retardants Delay Infinity', 'Sextoys & Accessoires',   256, null,  4.17,  'Import Concorde Pro — Réf 804404 — PASANTE (prix public non visible sur la capture — à compléter)'),
  ('Pasante — Boîte de 12 préservatifs extra-fins (Sensitive Feel)', 'Sextoys & Accessoires', 100, 7.99,  2.56,  'Import Concorde Pro — Réf 804352 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs en latex Regular',        'Sextoys & Accessoires',      63,  2.50,  0.82,  'Import Concorde Pro — Réf 804351 — PASANTE'),
  ('Pasante — Boîte de 12 préservatifs en latex Extra',         'Sextoys & Accessoires',      89,  7.99,  2.56,  'Import Concorde Pro — Réf 804354 — PASANTE'),
  ('Pasante — Boîte de 3 préservatifs extra-fins (Feel)',       'Sextoys & Accessoires',      210, 2.50,  0.82,  'Import Concorde Pro — Réf 804353 — PASANTE')
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
--   → attendu : 287 (258 des lots précédents + 29 de ce lot).
-- ═══════════════════════════════════════════════════════════
