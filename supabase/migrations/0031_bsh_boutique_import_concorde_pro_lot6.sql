-- ═══════════════════════════════════════════════════════════
-- 0031_bsh_boutique_import_concorde_pro_lot6.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : suite des lots précédents — lot 6 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 30 nouveaux articles.
--   2 captures de ce lot étaient des doublons exacts d'articles
--   déjà importés par 0029 (Pretty Love Varian/Osborn) — ignorées.
--   Première apparition des poupées gonflables (Candy Dolls) et
--   des piles (accessoire consommable pour les jouets vendus).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie (taxonomie déjà câblée, voir 0024) :
--   - "Sextoys & Accessoires" : l'essentiel du lot (vibromasseurs,
--     godes, poupées gonflables, piles — un consommable pour les
--     jouets déjà vendus, pas de catégorie dédiée plus pertinente).
--   - "BDSM & Contraintes" : les pinces à tétons vibrantes.
--   - "Coffrets & Expériences" : le coffret plaisir.
--
-- 2 piles sans prix public visible (la capture passe directement
--   au bouton "Ajouter au panier" sans afficher de prix public pour
--   ces deux références) : prix_vente laissé NULL.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Pretty Love Carnation',                                  'Sextoys & Accessoires', 5,   28.90, 8.35,  'Import Concorde Pro — Réf 530567003020 — PRETTY LOVE'),
  ('Pretty Love Trae',                                       'Sextoys & Accessoires', 107, 21.90, 6.22,  'Import Concorde Pro — Réf 530566001020 — PRETTY LOVE'),
  ('Vibromasseur Rabbit 4-en-1 avec va-et-vient',            'Sextoys & Accessoires', 10,  62.90, 19.52, 'Import Concorde Pro — Réf 530524005020 — PRETTY LOVE'),
  ('Vibromasseur Rabbit 4-en-1 Twinkled Coale',              'Sextoys & Accessoires', 1,   62.90, 9.76,  'Import Concorde Pro — Réf 530523020120 — PRETTY LOVE'),
  ('Pinces à tétons vibrantes Leaf',                         'BDSM & Contraintes',    0,   34.90, 9.98,  'Import Concorde Pro — Réf 530515005020 — PRETTY LOVE'),
  ('Culotte vibrante télécommandée',                          'Sextoys & Accessoires', 0,   37.90, 10.70, 'Import Concorde Pro — Réf 530549005020 — PRETTY LOVE'),
  ('Stimulayeur vibrant à tapotements Nauty',                'Sextoys & Accessoires', 7,   48.90, 14.46, 'Import Concorde Pro — Réf 530552020120 — PRETTY LOVE'),
  ('Culotte vibrante télécommandée Zico',                    'Sextoys & Accessoires', 0,   41.90, 12.29, 'Import Concorde Pro — Réf 530550005020 — PRETTY LOVE'),
  ('Doigt vibrant Gorgon',                                   'Sextoys & Accessoires', 44,  26.90, 7.24,  'Import Concorde Pro — Réf 530539001020 — PRETTY LOVE'),
  ('Vibromasseur rabbit 3-en-1 Shania',                      'Sextoys & Accessoires', 5,   59.90, 18.66, 'Import Concorde Pro — Réf 530538005020 — PRETTY LOVE'),
  ('Vibromasseur triple stimulation Cammy — Violet',         'Sextoys & Accessoires', 43,  73.90, 22.99, 'Import Concorde Pro — Réf 530537020120 — PRETTY LOVE'),
  ('Vibromasseur triple stimulation Cammy — Rose',           'Sextoys & Accessoires', 6,   73.90, 22.99, 'Import Concorde Pro — Réf 530537005020 — PRETTY LOVE'),
  ('Gode vibrant réaliste à squelette 24cm',                 'Sextoys & Accessoires', 0,   34.90, 7.65,  'Import Concorde Pro — Réf 530533019421 — BAILE'),
  ('Gode vibrant réaliste à squelette 21,8cm',                'Sextoys & Accessoires', 23,  34.90, 7.65,  'Import Concorde Pro — Réf 530533019420 — BAILE'),
  ('Gode ventouse réaliste à squelette 23,4cm',               'Sextoys & Accessoires', 0,   28.90, 6.68,  'Import Concorde Pro — Réf 530532019421 — BAILE'),
  ('Gode ventouse réaliste 20,5cm',                           'Sextoys & Accessoires', 0,   24.90, 5.57,  'Import Concorde Pro — Réf 530532019420 — BAILE'),
  ('Gode ventouse réaliste à squelette 19,4cm',               'Sextoys & Accessoires', 6,   26.90, 4.86,  'Import Concorde Pro — Réf 530531019420 — BAILE'),
  ('Gode ventouse réaliste à squelette 21,8cm',               'Sextoys & Accessoires', 0,   31.90, 6.26,  'Import Concorde Pro — Réf 530530019420 — BAILE'),
  ('Gode ventouse réaliste à squelette articulé',            'Sextoys & Accessoires', 0,   37.90, 7.65,  'Import Concorde Pro — Réf 530529019420 — BAILE'),
  ('Gode réaliste vibrant 19,5cm',                           'Sextoys & Accessoires', 13,  10.50, 2.37,  'Import Concorde Pro — Réf 530528019420 — BAILE'),
  ('Poupée gonflable Pretty Blonde — 3 orifices',            'Sextoys & Accessoires', 255, 82.00, 21.54, 'Import Concorde Pro — Réf 580305019420 — CANDY DOLLS'),
  ('Poupée gonflable Hot Redhead — 3 orifices',              'Sextoys & Accessoires', 189, 82.00, 21.54, 'Import Concorde Pro — Réf 580304019420 — CANDY DOLLS'),
  ('Poupée gonflable homme James',                           'Sextoys & Accessoires', 672, 35.90, 9.32,  'Import Concorde Pro — Réf 580303019420 — CANDY DOLLS'),
  ('Poupée gonflable Angela — 3 orifices',                   'Sextoys & Accessoires', 300, 35.90, 9.32,  'Import Concorde Pro — Réf 580302001020 — CANDY DOLLS'),
  ('Poupée gonflable Amber XXL',                             'Sextoys & Accessoires', 531, 38.90, 9.95,  'Import Concorde Pro — Réf 580301019420 — CANDY DOLLS'),
  ('Poupée gonflable Lolita — 3 orifices',                   'Sextoys & Accessoires', 265, 34.90, 8.99,  'Import Concorde Pro — Réf 580300019420 — CANDY DOLLS'),
  ('Coffret Plaisir 3',                                      'Coffrets & Expériences', 19,  29.90, 9.90,  'Import Concorde Pro — Réf 599122 — DIVERS CONCORDE'),
  ('4 Piles Panasonic LR06 AA',                              'Sextoys & Accessoires', 277, null,  2.71,  'Import Concorde Pro — Réf 597017 — PILES (prix public non affiché sur la capture — à compléter)'),
  ('4 Piles Panasonic LR03 AAA',                             'Sextoys & Accessoires', 90,  null,  2.71,  'Import Concorde Pro — Réf 597016 — PILES (prix public non affiché sur la capture — à compléter)'),
  ('Secretly — Culotte vibrante 3 en 1 point G',             'Sextoys & Accessoires', 629, 69.00, 19.26, 'Import Concorde Pro — Réf 531052005020 — YOBA')
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
--   → attendu : 162 (132 des lots précédents + 30 de ce lot).
--
--   select categorie, count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   group by categorie order by categorie;
--   → attendu : 5 lignes — "Aphrodisiaques & Bien-être" (32),
--     "BDSM & Contraintes" (5), "Coffrets & Expériences" (6),
--     "Lingerie & Tenues" (34), "Sextoys & Accessoires" (85).
-- ═══════════════════════════════════════════════════════════
