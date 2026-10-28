-- ═══════════════════════════════════════════════════════════
-- 0034_bsh_boutique_import_concorde_pro_lot9.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (count=258, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 9 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 32 nouveaux articles
--   (variantes Brazilian Balls, bougies et huiles de massage
--   Plaisir Secret, lubrifiants Yoba/pjur).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
-- Categorie : "Aphrodisiaques & Bien-être" pour tout le lot, sauf
--   le distributeur de gel automatique (accessoire générique, pas
--   un produit de plaisir — voir avertissement ci-dessous).
--
-- ⚠️ À signaler à Renée-Lise :
--   - Les 11 bougies de massage et l'huile Barbe à Papa n'affichent
--     aucun "Prix public conseillé" sur leur capture (le bouton
--     "Ajouter au panier" apparaît juste après le prix HT) —
--     prix_vente laissé NULL pour ces 12 articles, à compléter.
--   - "Distributeur de gel automatique" (Réf 826185) ressemble à un
--     distributeur de savon/gel hydroalcoolique générique, pas à un
--     produit d'intimité — importé tel quel (rangé dans "Sextoys &
--     Accessoires" faute de mieux), à retirer si ce n'est pas voulu
--     au catalogue.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Secret Play — Set 2 Brazilian Balls vibrator',           'Aphrodisiaques & Bien-être', 25,  7.50,  2.96,  'Import Concorde Pro — Réf 807037 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls effet chaud et froid',   'Aphrodisiaques & Bien-être', 26,  18.50, 6.66,  'Import Concorde Pro — Réf 807034 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls triple effet',       'Aphrodisiaques & Bien-être', 27,  8.95,  2.96,  'Import Concorde Pro — Réf 807049 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls vibrator',               'Aphrodisiaques & Bien-être', 26,  17.50, 6.70,  'Import Concorde Pro — Réf 807038 — SECRET PLAY'),
  ('Secret Play — Set 2 Brazilian Balls iceberg',            'Aphrodisiaques & Bien-être', 13,  8.50,  2.96,  'Import Concorde Pro — Réf 807051 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls triple effet',           'Aphrodisiaques & Bien-être', 24,  18.50, 6.70,  'Import Concorde Pro — Réf 807050 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls mix effets',             'Aphrodisiaques & Bien-être', 48,  19.50, 6.70,  'Import Concorde Pro — Réf 807053 — SECRET PLAY'),
  ('Secret Play — 6 Brazilian Balls iceberg',                'Aphrodisiaques & Bien-être', 20,  19.50, 6.70,  'Import Concorde Pro — Réf 807052 — SECRET PLAY'),
  ('Plaisir Secret — Bougie de massage coco 80ml',           'Aphrodisiaques & Bien-être', 188, null,  7.05,  'Import Concorde Pro — Réf 826012 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage chocolat 80ml',       'Aphrodisiaques & Bien-être', 328, null,  7.05,  'Import Concorde Pro — Réf 826011 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage fraise 80ml',         'Aphrodisiaques & Bien-être', 120, null,  7.05,  'Import Concorde Pro — Réf 826016 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage bubble gum 80ml',     'Aphrodisiaques & Bien-être', 163, null,  7.05,  'Import Concorde Pro — Réf 826015 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage grenadine 80ml',      'Aphrodisiaques & Bien-être', 538, null,  7.05,  'Import Concorde Pro — Réf 826020 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage pêche 80ml',          'Aphrodisiaques & Bien-être', 111, null,  7.05,  'Import Concorde Pro — Réf 826019 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage fruits exotiques 80ml','Aphrodisiaques & Bien-être', 170, null, 7.05,  'Import Concorde Pro — Réf 826033 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage barbe à papa 59ml',    'Aphrodisiaques & Bien-être', 309, null,  3.84,  'Import Concorde Pro — Réf 826030 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage ylang/patchouli 80ml','Aphrodisiaques & Bien-être', 0,   null,  7.05,  'Import Concorde Pro — Réf 826038 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage mojito 80ml',         'Aphrodisiaques & Bien-être', 461, null,  7.05,  'Import Concorde Pro — Réf 826034 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage bois rouge 80ml',     'Aphrodisiaques & Bien-être', 306, null,  7.05,  'Import Concorde Pro — Réf 826040 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Bougie de massage thé blanc 80ml',      'Aphrodisiaques & Bien-être', 499, null,  7.05,  'Import Concorde Pro — Réf 826039 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Yoba — Lubrifiant gourmand vanille 50ml',                'Aphrodisiaques & Bien-être', 361, 13.00, 2.97,  'Import Concorde Pro — Réf 826095 — YOBA'),
  ('Yoba — Lubrifiant gourmand caramel 50ml',                'Aphrodisiaques & Bien-être', 409, 13.00, 2.97,  'Import Concorde Pro — Réf 826094 — YOBA'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage chocolat 3ml',        'Aphrodisiaques & Bien-être', 86, 40.00, 12.20, 'Import Concorde Pro — Réf 826151 — PLAISIR SECRET'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage litchi 3ml',          'Aphrodisiaques & Bien-être', 13, 40.00, 12.20, 'Import Concorde Pro — Réf 826150 — PLAISIR SECRET'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage crème brûlée 3ml',    'Aphrodisiaques & Bien-être', 34, 40.00, 12.20, 'Import Concorde Pro — Réf 826155 — PLAISIR SECRET'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage fruits exotiques 3ml','Aphrodisiaques & Bien-être', 15, 40.00, 12.20, 'Import Concorde Pro — Réf 826154 — PLAISIR SECRET'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage vanille 3ml',        'Aphrodisiaques & Bien-être', 13, 40.00, 12.20, 'Import Concorde Pro — Réf 826158 — PLAISIR SECRET'),
  ('Plaisir Secret — Lot de 100 dosettes huile massage fraise 3ml',         'Aphrodisiaques & Bien-être', 0,  40.00, 12.20, 'Import Concorde Pro — Réf 826157 — PLAISIR SECRET'),
  ('pjur Original — Lubrifiant silicone 30ml',               'Aphrodisiaques & Bien-être', 62,  7.90,  3.57,  'Import Concorde Pro — Réf 841001 — PJUR'),
  ('Distributeur de gel automatique',                        'Sextoys & Accessoires',      203, 29.90, 9.60,  'Import Concorde Pro — Réf 826185 — DIVERS IMPORT'),
  ('pjur Back Door — Lubrifiant relaxant anal 30ml',         'Aphrodisiaques & Bien-être', 93,  9.30,  4.08,  'Import Concorde Pro — Réf 841009 — PJUR'),
  ('pjur Analyse Me — Lubrifiant anal 100ml',                'Aphrodisiaques & Bien-être', 75,  null,  9.27,  'Import Concorde Pro — Réf 841007 — PJUR (prix public non visible sur la capture — à compléter)')
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
--   → attendu : 258 (226 des lots précédents + 32 de ce lot).
-- ═══════════════════════════════════════════════════════════
