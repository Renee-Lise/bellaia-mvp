-- ═══════════════════════════════════════════════════════════
-- 0027_bsh_boutique_import_concorde_pro_lot3.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (count=80, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : suite de 0024/0025 — lot 3 de captures d'écran Concorde
--   Pro envoyées par Renée-Lise. 30 nouveaux articles, une nouvelle
--   famille de produits (parfums/phéromones, gels de massage,
--   compléments aphrodisiaques, poppers) absente des lots 1 et 2.
--
-- Mêmes règles que 0024/0025 : prix_vente = Prix public conseillé,
-- prix_achat = tarif HT remisé Concorde Pro, notes = traçabilité
-- fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie : tous ces articles sont des parfums/gels/compléments
--   à visée aphrodisiaque ou sensorielle → "Aphrodisiaques &
--   Bien-être" (taxonomie déjà câblée, voir 0024), SAUF les 2
--   "leather cleaner" (Rush Amyl, Amsterdam Special — poppers)
--   rangés dans "Sextoys & Accessoires" : ce sont des consommables
--   d'usage récréatif/sensoriel, pas des produits à ingérer comme
--   le reste du lot — choix de classement à ajuster si besoin.
--
-- 4 articles sans "Prix public conseillé" lisible sur la capture
--   (bouton "Ajouter au panier" juste après le prix, ou texte
--   coupé par la barre de navigation) : prix_vente laissé NULL,
--   à compléter par Renée-Lise plutôt que deviné.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Sex Spray 15ml',                                     'Aphrodisiaques & Bien-être', 128, null,  4.20, 'Import Concorde Pro — Réf 800062 — RUF (prix public non visible sur la capture — à compléter)'),
  ('Hot Sex Girl 20ml',                                  'Aphrodisiaques & Bien-être', 386, 8.90,  3.28, 'Import Concorde Pro — Réf 800056 — RUF'),
  ('Taboo For Her Frivole 50ml',                         'Aphrodisiaques & Bien-être', 101, 19.90, 6.53, 'Import Concorde Pro — Réf 800094 — RUF'),
  ('Larger 75ml',                                        'Aphrodisiaques & Bien-être', 40,  null,  4.12, 'Import Concorde Pro — Réf 800093 — RUF (prix public non visible sur la capture — à compléter)'),
  ('Penis Booster 75ml',                                 'Aphrodisiaques & Bien-être', 34,  19.40, 4.63, 'Import Concorde Pro — Réf 800097 — RUF'),
  ('Taboo For Him Libertin 50ml',                        'Aphrodisiaques & Bien-être', 96,  19.90, 6.53, 'Import Concorde Pro — Réf 800095 — RUF'),
  ('Rush Original 10ml',                                 'Sextoys & Accessoires',      1,   6.90,  1.92, 'Import Concorde Pro — Réf 800312 — LEATHER CLEANER'),
  ('Taboo Equivoque For Them 50ml',                      'Aphrodisiaques & Bien-être', 79,  19.90, 6.53, 'Import Concorde Pro — Réf 800297 — RUF'),
  ('Taboo Espiegle For Her 50ml',                        'Aphrodisiaques & Bien-être', 99,  19.90, 6.53, 'Import Concorde Pro — Réf 800296 — RUF'),
  ('Taboo Epicurien For Him 50ml',                       'Aphrodisiaques & Bien-être', 83,  19.90, 6.53, 'Import Concorde Pro — Réf 800295 — RUF'),
  ('Perfect Butt 125ml',                                 'Aphrodisiaques & Bien-être', 60,  13.50, 4.63, 'Import Concorde Pro — Réf 800371 — RUF'),
  ('Taboo Tentation For Her 50ml',                       'Aphrodisiaques & Bien-être', 104, 19.90, 7.26, 'Import Concorde Pro — Réf 800369 — RUF'),
  ('Taboo Male Booster Gel 30ml',                        'Aphrodisiaques & Bien-être', 34,  13.50, 4.62, 'Import Concorde Pro — Réf 800375 — RUF'),
  ('Taboo Pleasure Gel 30ml',                             'Aphrodisiaques & Bien-être', 109, 12.90, 4.48, 'Import Concorde Pro — Réf 800374 — RUF'),
  ('Aime Emoi 50ml',                                     'Aphrodisiaques & Bien-être', 32,  20.60, 6.49, 'Import Concorde Pro — Réf 800379 — RUF'),
  ('Taboo Pheroman For Her 15ml',                        'Aphrodisiaques & Bien-être', 115, 19.90, 5.78, 'Import Concorde Pro — Réf 800378 — RUF'),
  ('Amsterdam Special 24ml',                             'Sextoys & Accessoires',      42,  9.90,  2.74, 'Import Concorde Pro — Réf 810546 — LEATHER CLEANER'),
  ('Lip Gloss Vibrant Kiss — Piña Colada',                'Aphrodisiaques & Bien-être', 14,  8.90,  3.31, 'Import Concorde Pro — Réf 807054 — SECRET PLAY'),
  ('Spanish Fly Men 20ml',                               'Aphrodisiaques & Bien-être', 213, null,  4.58, 'Import Concorde Pro — Réf 800078 — CONCORDE (prix public non visible sur la capture — à compléter)'),
  ('Maxi Cum 30ml',                                      'Aphrodisiaques & Bien-être', 310, null,  5.04, 'Import Concorde Pro — Réf 800089 — CONCORDE (prix public partiellement masqué sur la capture — à compléter)'),
  ('Boost Erect 15 comprimés',                           'Aphrodisiaques & Bien-être', 70,  12.90, 4.09, 'Import Concorde Pro — Réf 850118 — LABO INTEXTONIC'),
  ('Rush Amyl 24ml',                                     'Sextoys & Accessoires',      131, 9.90,  2.74, 'Import Concorde Pro — Réf 801567 — LEATHER CLEANER'),
  ('Erection Booster — 30 comprimés',                    'Aphrodisiaques & Bien-être', 373, 15.90, 4.95, 'Import Concorde Pro — Réf 803004 — LABORATOIRE DYNAMI'),
  ('Sperma Abondance — 30 comprimés',                    'Aphrodisiaques & Bien-être', 379, 19.90, 4.50, 'Import Concorde Pro — Réf 803003 — LABORATOIRE DYNAMI'),
  ('Wet Kiss citron vert — Spray activateur de salive',  'Aphrodisiaques & Bien-être', 33,  16.00, 5.57, 'Import Concorde Pro — Réf 805088 — EXSENS'),
  ('Bois Bandé Booster — 30 comprimés',                  'Aphrodisiaques & Bien-être', 387, 12.90, 3.75, 'Import Concorde Pro — Réf 803005 — LABORATOIRE DYNAMI'),
  ('Orgie Touro — Crème stimulante homme 15ml',          'Aphrodisiaques & Bien-être', 222, 13.90, 5.14, 'Import Concorde Pro — Réf 841201 — ORGIE'),
  ('Orgie Touro XXXL — Crème stimulante',                'Aphrodisiaques & Bien-être', 140, 23.90, 7.30, 'Import Concorde Pro — Réf 841200 — ORGIE'),
  ('Orgie Orgasm Drops — Excitant clitoridien 30ml',     'Aphrodisiaques & Bien-être', 37,  17.70, 5.66, 'Import Concorde Pro — Réf 841209 — ORGIE'),
  ('Orgie Xtra Time Delay — Sérum retardant',            'Aphrodisiaques & Bien-être', 35,  18.50, 5.94, 'Import Concorde Pro — Réf 841208 — ORGIE')
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
--   → attendu : 80 (38 de 0024 + 12 de 0025 + 30 de 0027).
--
--   select categorie, count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   group by categorie order by categorie;
--   → attendu : 3 lignes — "Aphrodisiaques & Bien-être" (28),
--     "Coffrets & Expériences" (5), "Sextoys & Accessoires" (47).
-- ═══════════════════════════════════════════════════════════
