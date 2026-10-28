-- ═══════════════════════════════════════════════════════════
-- 0037_bsh_boutique_import_concorde_pro_lot12.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-28 (count=350, exact)
-- Auteur : Claude Code · Date de rédaction : 2026-10-28
-- Objet : suite des lots précédents — lot 12 de captures d'écran
--   Concorde Pro envoyées par Renée-Lise. 31 nouveaux articles
--   (huiles/gels de massage Orgie/Divine Xtases/Plaisir Secret,
--   soins intimes, 3 gadgets party/gag gift Fun Novelties).
--
-- Mêmes règles que les lots précédents : prix_vente = Prix public
-- conseillé, prix_achat = tarif HT remisé Concorde Pro, notes =
-- traçabilité fournisseur + clé d'idempotence (WHERE NOT EXISTS).
--
-- Categorie : "Aphrodisiaques & Bien-être" pour l'essentiel du lot
--   (huiles/gels de massage, soins intimes), "Coffrets &
--   Expériences" pour les 3 articles Fun Novelties (banane pénis,
--   dés lumineux, papier toilette Kama Sutra — des gadgets/gags
--   plutôt que des produits de plaisir au sens strict, à ajuster
--   si tu préfères les exclure).
--
-- 4 articles sans "Prix public conseillé" lisible sur leur capture
--   (bouton "Ajouter au panier" juste après le prix HT) : prix_vente
--   laissé NULL, à compléter.
--
-- Impact : entièrement additif (INSERT uniquement, idempotent).
-- ═══════════════════════════════════════════════════════════

insert into public.stocks
  (nom, nom_produit, categorie, univers, quantite, quantite_min, prix_vente, prix_achat, unite, statut, notes)
select v.nom, v.nom, v.categorie, 'BSH', v.quantite, 3, v.prix_vente, v.prix_achat, 'unité', 'actif', v.notes
from (values
  ('Secret Play — Huile de massage 2-en-1 et lubrifiant Passion', 'Aphrodisiaques & Bien-être', 8,   9.90,  4.87,  'Import Concorde Pro — Réf 807065 — SECRET PLAY'),
  ('Secret Play — Huile de massage 2-en-1 et lubrifiant Cerise',  'Aphrodisiaques & Bien-être', 0,   9.90,  4.87,  'Import Concorde Pro — Réf 807064 — SECRET PLAY'),
  ('Plaisir Secret — Bougie de massage Monoï 80ml',             'Aphrodisiaques & Bien-être', 83,  null,  7.05,  'Import Concorde Pro — Réf 826041 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Secret Play — Fem Drops, sérum hydratant intime',           'Aphrodisiaques & Bien-être', 19,  19.90, 8.61,  'Import Concorde Pro — Réf 807066 — SECRET PLAY'),
  ('Orgie Tantric — Pack de 3 huiles de massage',                'Aphrodisiaques & Bien-être', 30,  28.80, 9.20,  'Import Concorde Pro — Réf 841232 — ORGIE'),
  ('Plaisir Secret — Bougie de massage Spritz 80ml',            'Aphrodisiaques & Bien-être', 246, null,  7.05,  'Import Concorde Pro — Réf 826042 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Orgie Lube Tube Vibe! — Lubrifiant Sex on the Beach',       'Aphrodisiaques & Bien-être', 40,  16.50, 5.18,  'Import Concorde Pro — Réf 841234 — ORGIE'),
  ('Orgie Lube Tube Vibe! — Lubrifiant Piña Colada',            'Aphrodisiaques & Bien-être', 28,  16.50, 5.18,  'Import Concorde Pro — Réf 841233 — ORGIE'),
  ('Orgie Sexy Therapy — Coffret 3 huiles de massage',          'Aphrodisiaques & Bien-être', 33,  28.80, 9.20,  'Import Concorde Pro — Réf 841237 — ORGIE'),
  ('Orgie Bio — Lubrifiant à base d''eau et aloe vera',         'Aphrodisiaques & Bien-être', 23,  13.60, 4.28,  'Import Concorde Pro — Réf 841235 — ORGIE'),
  ('Orgie Acqua Croccante — Mousse de massage Monoï',           'Aphrodisiaques & Bien-être', 44,  22.50, 7.10,  'Import Concorde Pro — Réf 841239 — ORGIE'),
  ('Orgie Acqua Croccante — Mousse de massage Sakura',          'Aphrodisiaques & Bien-être', 24,  22.50, 7.10,  'Import Concorde Pro — Réf 841238 — ORGIE'),
  ('Divine Xtases — Gel Glisse lubrifiant bio parfum barbe à papa', 'Aphrodisiaques & Bien-être', 40, 19.90, 8.50, 'Import Concorde Pro — Réf 805091 — DIVINE XTASES'),
  ('Divine Xtases — Huile de massage bio parfum barbe à papa',  'Aphrodisiaques & Bien-être', 54,  19.90, 9.90,  'Import Concorde Pro — Réf 805092 — DIVINE XTASES'),
  ('Lubrix Nature — Lubrifiant à base d''eau 50ml',             'Aphrodisiaques & Bien-être', 0,   5.50,  2.03,  'Import Concorde Pro — Réf 800109 — LUBRIX'),
  ('Divine Xtases — Gel intime bio apaisant vulve',             'Aphrodisiaques & Bien-être', 7,   22.90, 9.90,  'Import Concorde Pro — Réf 805083 — DIVINE XTASES'),
  ('Lubrix Nature — Lubrifiant à base d''eau 200ml',            'Aphrodisiaques & Bien-être', 225, 10.90, 4.00,  'Import Concorde Pro — Réf 800111 — LUBRIX'),
  ('Lubrix Nature — Lubrifiant à base d''eau 100ml',            'Aphrodisiaques & Bien-être', 0,   7.50,  2.84,  'Import Concorde Pro — Réf 800110 — LUBRIX'),
  ('Plaisir Secret — Huile de massage Monoï 30ml',              'Aphrodisiaques & Bien-être', 409, null,  1.98,  'Import Concorde Pro — Réf 826085 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage Nature 30ml',             'Aphrodisiaques & Bien-être', 414, null,  1.98,  'Import Concorde Pro — Réf 826084 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage fruits exotiques 30ml',   'Aphrodisiaques & Bien-être', 393, null,  1.98,  'Import Concorde Pro — Réf 826087 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage vanille 30ml',            'Aphrodisiaques & Bien-être', 431, null,  1.98,  'Import Concorde Pro — Réf 826086 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage à la fraise 30ml',        'Aphrodisiaques & Bien-être', 752, null,  1.98,  'Import Concorde Pro — Réf 826089 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Plaisir Secret — Huile de massage coco 30ml',               'Aphrodisiaques & Bien-être', 621, null,  1.98,  'Import Concorde Pro — Réf 826088 — PLAISIR SECRET (prix public non visible sur la capture — à compléter)'),
  ('Orgie Acqua Croccante — Mousse de massage Strawberry',      'Aphrodisiaques & Bien-être', 13,  22.50, 7.10,  'Import Concorde Pro — Réf 841241 — ORGIE'),
  ('Orgie Acqua Croccante — Mousse de massage Passion Fruit',   'Aphrodisiaques & Bien-être', 10,  22.50, 7.10,  'Import Concorde Pro — Réf 841240 — ORGIE'),
  ('Orgie Men Clean — Spray intime homme',                      'Aphrodisiaques & Bien-être', 59,  20.70, 7.92,  'Import Concorde Pro — Réf 841243 — ORGIE'),
  ('Orgie Intimist — Brume intime femme 30ml',                  'Aphrodisiaques & Bien-être', 57,  20.70, 7.92,  'Import Concorde Pro — Réf 841242 — ORGIE'),
  ('Banane Pénis',                                              'Coffrets & Expériences',     146, 9.50,  1.65,  'Import Concorde Pro — Réf 500505 — FUN NOVELTIES'),
  ('Dés lumineux géants (Big Glowing Dice)',                    'Coffrets & Expériences',     386, 3.00,  0.83,  'Import Concorde Pro — Réf 500526 — FUN NOVELTIES'),
  ('Papier toilette Kama Sutra',                                'Coffrets & Expériences',     265, null,  1.13,  'Import Concorde Pro — Réf 500507 — FUN NOVELTIES (prix public non visible sur la capture — à compléter)')
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
--   → attendu : 350 (319 des lots précédents + 31 de ce lot).
-- ═══════════════════════════════════════════════════════════
