-- ═══════════════════════════════════════════════════════════
-- 0030_bsh_boutique_import_concorde_pro_lot5.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : suite des lots précédents — lot 5 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 26 nouveaux articles.
--   3 paires de captures de ce lot étaient des doublons exacts
--   (mêmes références, recapturées) — ignorées, aucune ligne
--   dupliquée. Première grosse vague de lingerie/déguisements
--   (marque Paris Hollywood, y compris une gamme de Noël).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie (taxonomie déjà câblée, voir 0024) :
--   - "Lingerie & Tenues" : toute la lingerie et les déguisements
--     Paris Hollywood (y compris la gamme de Noël).
--   - "Sextoys & Accessoires" : les 2 Pretty Love et les 2 Strap-On
--     Real Body.
--
-- 3 articles sans prix public lisible (texte coupé par la barre de
--   navigation du téléphone, chiffre de tête illisible) : prix_vente
--   laissé NULL plutôt que deviné.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Body Mère Noël en dentelle',                            'Lingerie & Tenues',     0,   32.90, 12.03, 'Import Concorde Pro — Réf 747523003000 — PARIS HOLLYWOOD'),
  ('Body Mère Noël 4 pièces',                                'Lingerie & Tenues',     2,   44.50, 12.51, 'Import Concorde Pro — Réf 747522003010 — PARIS HOLLYWOOD'),
  ('Cache-tétons à clochettes',                              'Lingerie & Tenues',     136, 12.90, 4.14,  'Import Concorde Pro — Réf 742488003000 — PARIS HOLLYWOOD'),
  ('Cache-tétons à pompoms',                                 'Lingerie & Tenues',     0,   12.90, 4.40,  'Import Concorde Pro — Réf 742489003000 — PARIS HOLLYWOOD'),
  ('Body harnais ajustable — Rouge',                         'Lingerie & Tenues',     1,   27.90, 9.54,  'Import Concorde Pro — Réf 747578021400 — PARIS HOLLYWOOD'),
  ('Body harnais ajustable — Noir',                          'Lingerie & Tenues',     13,  27.90, 9.54,  'Import Concorde Pro — Réf 747578001000 — PARIS HOLLYWOOD'),
  ('Robe sexy en wetlook avec string',                       'Lingerie & Tenues',     0,   31.90, 11.12, 'Import Concorde Pro — Réf 747590001010 — PARIS HOLLYWOOD'),
  ('Body sexy façon lanières',                               'Lingerie & Tenues',     27,  25.90, 8.93,  'Import Concorde Pro — Réf 747589001010 — PARIS HOLLYWOOD'),
  ('Nuisette transparente avec laçage au dos',                'Lingerie & Tenues',     33,  27.90, 9.56,  'Import Concorde Pro — Réf 747593001010 — PARIS HOLLYWOOD'),
  ('String sexy en guipure',                                 'Lingerie & Tenues',     11,  null,  2.78,  'Import Concorde Pro — Réf 747592003010 — PARIS HOLLYWOOD (prix public non visible sur la capture — à compléter)'),
  ('Nuisette longue et sexy rouge + string',                 'Lingerie & Tenues',     35,  29.90, 10.66, 'Import Concorde Pro — Réf 747622003010 — PARIS HOLLYWOOD'),
  ('Ensemble lingerie rouge à cœur — 2 pièces',              'Lingerie & Tenues',     13,  24.50, 8.52,  'Import Concorde Pro — Réf 747621003010 — PARIS HOLLYWOOD'),
  ('Déguisement policière sexy — 4 pièces',                  'Lingerie & Tenues',     25,  47.90, 16.73, 'Import Concorde Pro — Réf 747612001010 — PARIS HOLLYWOOD'),
  ('Déguisement d''infirmière sexy — 5 pièces',               'Lingerie & Tenues',     21,  39.90, 14.61, 'Import Concorde Pro — Réf 747611002010 — PARIS HOLLYWOOD'),
  ('Body ouvert en dentelle — Rouge',                        'Lingerie & Tenues',     143, 22.50, 7.74,  'Import Concorde Pro — Réf 747650003000 — PARIS HOLLYWOOD'),
  ('Body ouvert en dentelle — Noir',                         'Lingerie & Tenues',     139, 22.50, 7.74,  'Import Concorde Pro — Réf 747650001000 — PARIS HOLLYWOOD'),
  ('String Père Noël en velours rouge — Homme',              'Lingerie & Tenues',     20,  null,  3.04,  'Import Concorde Pro — Réf 747680003000 — PARIS HOLLYWOOD (prix public illisible, chiffre coupé par la barre de navigation — à compléter)'),
  ('Nuisette sexy en dentelle florale noire',                'Lingerie & Tenues',     0,   null,  8.78,  'Import Concorde Pro — Réf 747651001010 — PARIS HOLLYWOOD (prix public illisible, chiffre coupé par la barre de navigation — à compléter)'),
  ('Robe de Mère Noël en résille',                           'Lingerie & Tenues',     12,  12.90, 4.52,  'Import Concorde Pro — Réf 747677003000 — PARIS HOLLYWOOD'),
  ('Bonnet de Noël rouge pailleté',                          'Lingerie & Tenues',     87,  5.90,  1.17,  'Import Concorde Pro — Réf 747681003000 — PARIS HOLLYWOOD'),
  ('Robe de Noël sexy avec manchettes',                      'Lingerie & Tenues',     7,   15.90, 5.38,  'Import Concorde Pro — Réf 747679003000 — PARIS HOLLYWOOD'),
  ('Body Mère Noël rouge en résille',                        'Lingerie & Tenues',     28,  17.90, 6.17,  'Import Concorde Pro — Réf 747678003000 — PARIS HOLLYWOOD'),
  ('Freda — Vibromasseur rabbit en silicone',                'Sextoys & Accessoires', 44,  29.90, 9.78,  'Import Concorde Pro — Réf 530147 — PRETTY LOVE'),
  ('Abner — Œuf vibrant silicone connecté',                  'Sextoys & Accessoires', 74,  44.90, 13.74, 'Import Concorde Pro — Réf 530145 — PRETTY LOVE'),
  ('Strap-On Jayson — Gode ceinture 21cm',                   'Sextoys & Accessoires', 104, 39.90, 10.33, 'Import Concorde Pro — Réf 514128 — REAL BODY'),
  ('Strap-On Tony — Gode ceinture 18cm',                     'Sextoys & Accessoires', 0,   34.90, 9.07,  'Import Concorde Pro — Réf 514127 — REAL BODY')
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
--   → attendu : 132 (106 des lots précédents + 26 de ce lot).
--
--   select categorie, count(*) from public.stocks
--   where univers='BSH' and notes like 'Import Concorde Pro%'
--   group by categorie order by categorie;
--   → attendu : 5 lignes — "Aphrodisiaques & Bien-être" (32),
--     "BDSM & Contraintes" (4), "Coffrets & Expériences" (5),
--     "Lingerie & Tenues" (34), "Sextoys & Accessoires" (57).
-- ═══════════════════════════════════════════════════════════
