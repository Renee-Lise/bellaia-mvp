-- ═══════════════════════════════════════════════════════════
-- 0033_bsh_boutique_import_concorde_pro_lot8.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 8 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 32 nouveaux articles
--   (bougies de massage, lubrifiants, préservatifs, Brazilian Balls,
--   drap vinyle fetish, tampons).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie (taxonomie déjà câblée, voir 0024) :
--   - "BDSM & Contraintes" : les 2 draps vinyle grand format
--     (Fetish Tentation).
--   - "Sextoys & Accessoires" : les 6 boîtes de préservatifs
--     Sensitex — pas de catégorie "santé/hygiène" dans la
--     taxonomie actuelle, rangés ici comme accessoire le plus
--     proche.
--   - "Aphrodisiaques & Bien-être" : tout le reste (bougies de
--     massage, lubrifiants, Brazilian Balls, Calme Intime).
--
-- ⚠️ À signaler à Renée-Lise : ce lot contient aussi des tampons
--   hygiéniques (Beppy, 4 références). Ce ne sont pas des produits
--   de plaisir — rangés par défaut dans "Aphrodisiaques & Bien-être"
--   faute de catégorie plus pertinente, mais à retirer de la
--   boutique si elle ne les veut pas au catalogue (import fait tel
--   quel, sans trier ce qu'elle a capturé).
--
-- 1 article sans "Prix public conseillé" lisible sur la capture
--   (coupé par l'écran suivant) : prix_vente laissé NULL.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Drap vinyle grand format — Rouge',                       'BDSM & Contraintes',         529,  25.90, 7.29,  'Import Concorde Pro — Réf 520180003004 — FETISH TENTATION'),
  ('Drap vinyle grand format — Noir',                        'BDSM & Contraintes',         590,  25.90, 7.29,  'Import Concorde Pro — Réf 520180001004 — FETISH TENTATION'),
  ('Taboo for Him — Bougie de massage Caresses Ardentes',    'Aphrodisiaques & Bien-être', 6,    25.80, 8.02,  'Import Concorde Pro — Réf 800234 — RUF'),
  ('Taboo for Her — Bougie de massage Plaisir Charnel',      'Aphrodisiaques & Bien-être', 21,   25.80, 8.02,  'Import Concorde Pro — Réf 800233 — RUF'),
  ('Beppy Dry Classic x30',                                  'Aphrodisiaques & Bien-être', 42,   49.95, 18.16, 'Import Concorde Pro — Réf 800274 — BEPPY'),
  ('Taboo for Him — Bougie de massage Jeux Interdits',       'Aphrodisiaques & Bien-être', 22,   25.80, 8.02,  'Import Concorde Pro — Réf 800235 — RUF'),
  ('Beppy Soft Comfort Tampons Wet x4',                      'Aphrodisiaques & Bien-être', 69,   14.95, 5.88,  'Import Concorde Pro — Réf 800298 — BEPPY'),
  ('Beppy Soft Comfort Tampons Dry x8',                      'Aphrodisiaques & Bien-être', 119,  15.40, 6.29,  'Import Concorde Pro — Réf 800278 — BEPPY'),
  ('Calme Intime 50ml',                                      'Aphrodisiaques & Bien-être', 125,  null,  7.45,  'Import Concorde Pro — Réf 800390 — LABO INTEXTONIC (prix public non visible sur la capture — à compléter)'),
  ('Beppy Soft Comfort Tampons Dry x4',                      'Aphrodisiaques & Bien-être', 24,   11.20, 4.69,  'Import Concorde Pro — Réf 800370 — BEPPY'),
  ('Sensitex — Boîte de 144 préservatifs Extra Fino',        'Sextoys & Accessoires',      33,   39.90, 19.90, 'Import Concorde Pro — Réf 804180 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs Natural XL',        'Sextoys & Accessoires',      67,   39.90, 19.90, 'Import Concorde Pro — Réf 804053 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs Natural',           'Sextoys & Accessoires',      62,   39.90, 16.90, 'Import Concorde Pro — Réf 804182 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs Extra Fuerte',      'Sextoys & Accessoires',      35,   39.90, 17.90, 'Import Concorde Pro — Réf 804181 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs Sabor Fresa',       'Sextoys & Accessoires',      15,   39.90, 17.90, 'Import Concorde Pro — Réf 804184 — SENSITEX'),
  ('Sensitex — Boîte de 144 préservatifs Tutti Frutti',      'Sextoys & Accessoires',      37,   39.90, 17.90, 'Import Concorde Pro — Réf 804183 — SENSITEX'),
  ('Divine Xtases — Gel Glisse lubrifiant vanille 100% BIO 100ml', 'Aphrodisiaques & Bien-être', 23, 18.80, 9.90, 'Import Concorde Pro — Réf 805063 — DIVINE XTASES'),
  ('Divine Xtases — Gel Glisse lubrifiant anal 100% BIO 100ml',    'Aphrodisiaques & Bien-être', 27, 18.90, 9.90, 'Import Concorde Pro — Réf 805062 — DIVINE XTASES'),
  ('Exsens Aloe Vera — Gel lubrifiant aromatisé 100ml',      'Aphrodisiaques & Bien-être', 8,    9.80,  4.18,  'Import Concorde Pro — Réf 805076 — EXSENS'),
  ('Exsens Candy Apple — Gel lubrifiant aromatisé 100ml',    'Aphrodisiaques & Bien-être', 10,   9.80,  4.18,  'Import Concorde Pro — Réf 805075 — EXSENS'),
  ('Secret Play — Set 2 Brazilian Balls fraise',             'Aphrodisiaques & Bien-être', 12,   5.90,  2.83,  'Import Concorde Pro — Réf 807003 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls chocolat',           'Aphrodisiaques & Bien-être', 12,   5.90,  2.83,  'Import Concorde Pro — Réf 807001 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls effet chaud',        'Aphrodisiaques & Bien-être', 10,   7.90,  2.83,  'Import Concorde Pro — Réf 807006 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls menthe',             'Aphrodisiaques & Bien-être', 26,   5.90,  2.83,  'Import Concorde Pro — Réf 807004 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls fraise',                 'Aphrodisiaques & Bien-être', 13,   12.90, 4.98,  'Import Concorde Pro — Réf 807013 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls fruits',                 'Aphrodisiaques & Bien-être', 30,   12.90, 4.98,  'Import Concorde Pro — Réf 807008 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls effet froid',        'Aphrodisiaques & Bien-être', 8,    7.90,  2.96,  'Import Concorde Pro — Réf 807020 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls menthe',                 'Aphrodisiaques & Bien-être', 23,   12.90, 4.98,  'Import Concorde Pro — Réf 807014 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls effet chaud',            'Aphrodisiaques & Bien-être', 16,   17.90, 6.66,  'Import Concorde Pro — Réf 807022 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls effet froid',            'Aphrodisiaques & Bien-être', 8,    17.90, 6.66,  'Import Concorde Pro — Réf 807021 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls fraise et champagne','Aphrodisiaques & Bien-être', 30,   5.50,  2.96,  'Import Concorde Pro — Réf 807025 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls effet chaud et froid','Aphrodisiaques & Bien-être', 44,  7.90,  2.96,  'Import Concorde Pro — Réf 807024 — SECRET PLAY')
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
--   → attendu : 226 (194 des lots précédents + 32 de ce lot).
-- ═══════════════════════════════════════════════════════════
