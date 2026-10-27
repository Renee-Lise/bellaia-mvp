-- ═══════════════════════════════════════════════════════════
-- 0029_bsh_boutique_import_concorde_pro_lot4.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : suite de 0024/0025/0027 — lot 4 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 26 nouveaux articles
--   (4 autres captures de ce lot étaient des doublons exacts
--   d'articles déjà importés par 0027 — ignorés, aucune ligne
--   dupliquée). Première apparition de lingerie (marque Paris
--   Hollywood/Starbust) et d'accessoires BDSM dans les imports.
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie (taxonomie déjà câblée, voir 0024) :
--   - "Lingerie & Tenues" : la lingerie Starbust/Paris Hollywood.
--   - "BDSM & Contraintes" : harnais de bondage, coffret SM, pinces
--     tétons.
--   - "Sextoys & Accessoires" : poppers (même choix que 0027) et
--     les 2 plugs Pretty Love.
--   - "Aphrodisiaques & Bien-être" : gels de sexe oral aromatisés.
--
-- 2 articles sans "Prix public conseillé" lisible (coupé par la
--   barre de navigation du téléphone) : prix_vente laissé NULL.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Super Rush Black Label 24ml',                          'Sextoys & Accessoires',      170, 12.90, 3.57,  'Import Concorde Pro — Réf 801580 — LEATHER CLEANER'),
  ('Radikal Rush — Ultra Strong Amyl 10ml',                 'Sextoys & Accessoires',      11,  9.90,  2.60,  'Import Concorde Pro — Réf 800579 — LEATHER CLEANER'),
  ('Iron Fist Supreme 24ml',                                'Sextoys & Accessoires',      0,   12.90, 3.75,  'Import Concorde Pro — Réf 801582 — LEATHER CLEANER'),
  ('Iron Fist Ultra Exclusive 24ml',                        'Sextoys & Accessoires',      133, 9.90,  3.57,  'Import Concorde Pro — Réf 801581 — LEATHER CLEANER'),
  ('Divine Xtases — Gel sexe oral fraise bio 50ml',         'Aphrodisiaques & Bien-être', 29,  17.90, 9.30,  'Import Concorde Pro — Réf 805094 — DIVINE XTASES'),
  ('Divine Xtases — Gel sexe oral passion bio 50ml',        'Aphrodisiaques & Bien-être', 29,  17.90, 9.30,  'Import Concorde Pro — Réf 805093 — DIVINE XTASES'),
  ('pjur Organic — Gel intime oral cerise 100ml',           'Aphrodisiaques & Bien-être', 11,  19.95, 8.08,  'Import Concorde Pro — Réf 841121 — PJUR'),
  ('pjur Organic — Gel intime oral caramel 100ml',          'Aphrodisiaques & Bien-être', 12,  19.95, 8.08,  'Import Concorde Pro — Réf 841120 — PJUR'),
  ('Harnais de bondage pour poitrine — Femme',              'BDSM & Contraintes',         15,  28.90, 9.28,  'Import Concorde Pro — Réf 501195001000 — LOVE HIT BY VIRGITE'),
  ('Harnais de bondage pour poitrine — Homme',              'BDSM & Contraintes',         0,   28.90, 8.35,  'Import Concorde Pro — Réf 501194001000 — LOVE HIT BY VIRGITE'),
  ('Coffret Bondage SM — 10 pièces',                        'BDSM & Contraintes',         1,   46.90, 13.98, 'Import Concorde Pro — Réf 520182001020 — FETISH TENTATION'),
  ('Surprise Box rose — Pinces tétons',                     'BDSM & Contraintes',         9,   33.90, 9.68,  'Import Concorde Pro — Réf 530516005020 — PRETTY LOVE'),
  ('Starbust — Coussinets Push-up',                         'Lingerie & Tenues',          21,  13.90, 4.76,  'Import Concorde Pro — Réf 730002013004 — STARBUST'),
  ('Starbust — Cache-téton silicone',                       'Lingerie & Tenues',          259, 6.90,  2.07,  'Import Concorde Pro — Réf 730001019400 — STARBUST'),
  ('Starbust — Gaine string noir',                          'Lingerie & Tenues',          123, 22.90, 5.63,  'Import Concorde Pro — Réf 730005001007 — STARBUST'),
  ('Starbust — Soutien-gorge auto-fixant silicone',         'Lingerie & Tenues',          18,  14.90, 4.42,  'Import Concorde Pro — Réf 730003919421 — STARBUST'),
  ('Cache-tétons ronds noir — Taille unique',               'Lingerie & Tenues',          0,   12.90, 3.44,  'Import Concorde Pro — Réf 7424820010 — PARIS HOLLYWOOD'),
  ('Starbust — Gaine string chair',                         'Lingerie & Tenues',          95,  22.90, 5.63,  'Import Concorde Pro — Réf 730005019407 — STARBUST'),
  ('Panty P5152 — Rose',                                    'Lingerie & Tenues',          16,  null,  3.40,  'Import Concorde Pro — Réf 746156005000 — PARIS HOLLYWOOD (prix public non visible sur la capture — à compléter)'),
  ('Panty P5152 — Bleu',                                    'Lingerie & Tenues',          17,  null,  3.83,  'Import Concorde Pro — Réf 746156004000 — PARIS HOLLYWOOD (prix public non visible sur la capture — à compléter)'),
  ('Slip homme MP061 — Noir',                               'Lingerie & Tenues',          4,   15.00, 4.67,  'Import Concorde Pro — Réf 746241001004 — PARIS HOLLYWOOD'),
  ('Boxer homme MP056 — Noir',                              'Lingerie & Tenues',          6,   15.50, 5.18,  'Import Concorde Pro — Réf 746239001003 — PARIS HOLLYWOOD'),
  ('Bas jarretières nœuds — Noir, taille unique',           'Lingerie & Tenues',          30,  12.90, 4.20,  'Import Concorde Pro — Réf 747419001000 — PARIS HOLLYWOOD'),
  ('Gants dentelle — Noir, taille unique',                  'Lingerie & Tenues',          0,   7.90,  2.83,  'Import Concorde Pro — Réf 747416001000 — PARIS HOLLYWOOD'),
  ('Pretty Love Varian — Taille L',                         'Sextoys & Accessoires',      63,  32.90, 9.71,  'Import Concorde Pro — Réf 530573001005 — PRETTY LOVE'),
  ('Pretty Love Osborn — Taille M',                         'Sextoys & Accessoires',      0,   31.90, 9.10,  'Import Concorde Pro — Réf 530573001004 — PRETTY LOVE')
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
--   → attendu : 106 (80 des lots 1 à 3 + 26 de ce lot).
--
--   select categorie, count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   group by categorie order by categorie;
--   → attendu : 5 lignes — "Aphrodisiaques & Bien-être" (32),
--     "BDSM & Contraintes" (4), "Coffrets & Expériences" (5),
--     "Lingerie & Tenues" (12), "Sextoys & Accessoires" (53).
--     ("Lingerie & Tenues" apparaît pour la première fois dans ces
--     imports.)
-- ═══════════════════════════════════════════════════════════
